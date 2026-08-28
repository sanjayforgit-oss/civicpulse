import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc

from backend.core.database import get_db
from backend.models.complaint import Complaint, UpvoteRecord
from backend.schemas.complaint import (
    ComplaintCreateRequest,
    ComplaintResponse,
    ComplaintSubmitResult,
    ComplaintStatusUpdateRequest,
    UpvoteResponse,
    HeatmapPoint,
    HeatmapAnalyticsResponse
)

from backend.core.storage import storage_service
from backend.core.authenticity import authenticity_detector
from backend.core.sarvam import sarvam_engine
from backend.core.categorizer import categorizer_engine
from backend.core.duplicate_detector import duplicate_detector
from backend.core.priority import calculate_dynamic_priority
from backend.core.dispute_verifier import dispute_verifier
from backend.schemas.analysis import (
    CitizenVerificationRequest,
    ResolutionVerificationResponse,
    DisputeActionEnum,
    DisputeDecisionEnum
)


router = APIRouter(prefix="/complaints", tags=["Complaints & Dynamic Priority"])

@router.post("/submit", response_model=ComplaintSubmitResult)
async def submit_complaint(
    request: ComplaintCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a new civic complaint with automated AI pipeline:
    1. EXIF GPS / Authenticity Verification
    2. Voice STT & Translation
    3. Multimodal Issue Categorization
    4. 2-Tier Geospatial & Semantic Duplicate Detection
    5. Dynamic Priority Score Calculation
    """
    # 1. Resolve media files
    image_url = None
    sanitized_image_url = None
    audio_url = None
    lat = request.latitude
    lon = request.longitude
    is_authentic = True
    auth_prob = 0.0

    if request.image_media_id:
        rec = storage_service.get_media_record(request.image_media_id)
        if rec:
            image_url = f"/uploads/original/{rec['filename']}"
            if rec.get("sanitized_path"):
                sanitized_image_url = f"/uploads/sanitized/{rec['filename']}"
            
            # Check Authenticity
            auth = await authenticity_detector.validate_image(rec["file_path"])
            is_authentic = auth["is_authentic"]
            auth_prob = auth["ai_generated_probability"]

    if request.audio_media_id:
        rec = storage_service.get_media_record(request.audio_media_id)
        if rec:
            audio_url = f"/uploads/audio/{rec['filename']}"

    # 2. Voice STT & Translation
    original_text = request.text_description or ""
    translated_text = original_text
    detected_lang = "en-IN"

    if request.audio_media_id and not original_text:
        rec = storage_service.get_media_record(request.audio_media_id)
        if rec:
            stt = await sarvam_engine.speech_to_text(rec["file_path"])
            original_text = stt["transcript"]
            detected_lang = stt["language_code"]
            trans = await sarvam_engine.translate_text(original_text, source_language_code=detected_lang)
            translated_text = trans["translated_text"]
    elif original_text:
        trans = await sarvam_engine.translate_text(original_text, source_language_code="auto")
        translated_text = trans["translated_text"]
        detected_lang = trans["source_language_code"]

    # 3. Categorization & Severity
    img_path_for_cat = None
    if request.image_media_id:
        rec = storage_service.get_media_record(request.image_media_id)
        if rec:
            img_path_for_cat = rec.get("sanitized_path") or rec.get("file_path")

    cat_result = await categorizer_engine.categorize_issue(
        image_path=img_path_for_cat,
        description_text=translated_text,
        location_hint=request.location_address
    )

    # 4. Duplicate Detection against active complaints
    q = select(Complaint).where(Complaint.status.in_(["REPORTED", "ASSIGNED", "IN_PROGRESS"]))
    res = await db.execute(q)
    active_rows = res.scalars().all()
    active_dicts = [
        {
            "id": c.id,
            "category": c.category,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "original_description": c.original_description,
            "translated_description": c.translated_description,
            "cluster_root_id": c.cluster_root_id
        }
        for c in active_rows
    ]

    is_dup, primary_id, dist_m, sim_score = duplicate_detector.check_duplicate(
        new_category=cat_result.category.value,
        new_lat=lat,
        new_lon=lon,
        new_description=translated_text,
        active_complaints=active_dicts
    )

    # 5. Compute Priority Score
    dup_count = 1
    upvotes = 1
    if is_dup and primary_id:
        # Fetch primary to update its duplicate counter and priority
        primary_comp = await db.get(Complaint, primary_id)
        if primary_comp:
            primary_comp.duplicate_report_count += 1
            primary_comp.upvote_count += 1
            p_calc = calculate_dynamic_priority(
                base_severity=primary_comp.base_severity_score,
                upvotes=primary_comp.upvote_count,
                duplicate_count=primary_comp.duplicate_report_count,
                created_at=primary_comp.created_at,
                is_vulnerable_zone=primary_comp.is_vulnerable_zone,
                urgency_level=primary_comp.urgency_level
            )
            primary_comp.priority_score = p_calc["priority_score"]
            await db.flush()

    p_calc_new = calculate_dynamic_priority(
        base_severity=cat_result.base_severity_score,
        upvotes=upvotes,
        duplicate_count=dup_count,
        created_at=datetime.datetime.utcnow(),
        is_vulnerable_zone=request.is_vulnerable_zone,
        urgency_level=cat_result.urgency_level.value
    )

    # 6. Save Complaint
    complaint_id = f"cmp_{uuid.uuid4().hex[:10]}"
    complaint_entry = Complaint(
        id=complaint_id,
        citizen_user_id=request.citizen_user_id or "anonymous_citizen",
        image_url=image_url,
        sanitized_image_url=sanitized_image_url,
        audio_url=audio_url,
        latitude=lat,
        longitude=lon,
        location_address=request.location_address,
        is_vulnerable_zone=request.is_vulnerable_zone,
        original_description=original_text,
        translated_description=translated_text,
        detected_language=detected_lang,
        category=cat_result.category.value,
        category_display_name=cat_result.category_display_name,
        department=cat_result.department.value,
        department_display_name=cat_result.department_display_name,
        is_authentic_image=is_authentic,
        authenticity_probability=auth_prob,
        base_severity_score=cat_result.base_severity_score,
        urgency_level=cat_result.urgency_level.value,
        priority_score=p_calc_new["priority_score"],
        upvote_count=1,
        duplicate_report_count=1,
        is_cluster_root=not is_dup,
        cluster_root_id=primary_id if is_dup else None,
        status="REPORTED",
        detected_hazards=cat_result.detected_hazards,
        recommended_action=cat_result.recommended_action,
        tags=cat_result.tags
    )

    db.add(complaint_entry)
    await db.commit()
    await db.refresh(complaint_entry)

    msg = f"Duplicate of #{primary_id} detected within {dist_m}m. Auto-clustered and escalated primary issue." if is_dup else "Complaint submitted successfully."

    return ComplaintSubmitResult(
        success=True,
        is_duplicate=is_dup,
        complaint=ComplaintResponse(
            id=complaint_entry.id,
            citizen_user_id=complaint_entry.citizen_user_id,
            image_url=complaint_entry.image_url,
            sanitized_image_url=complaint_entry.sanitized_image_url,
            audio_url=complaint_entry.audio_url,
            latitude=complaint_entry.latitude,
            longitude=complaint_entry.longitude,
            location_address=complaint_entry.location_address,
            is_vulnerable_zone=complaint_entry.is_vulnerable_zone,
            original_description=complaint_entry.original_description,
            translated_description=complaint_entry.translated_description,
            detected_language=complaint_entry.detected_language,
            category=complaint_entry.category,
            category_display_name=complaint_entry.category_display_name,
            department=complaint_entry.department,
            department_display_name=complaint_entry.department_display_name,
            is_authentic_image=complaint_entry.is_authentic_image,
            authenticity_probability=complaint_entry.authenticity_probability,
            base_severity_score=complaint_entry.base_severity_score,
            urgency_level=complaint_entry.urgency_level,
            priority_score=complaint_entry.priority_score,
            upvote_count=complaint_entry.upvote_count,
            duplicate_report_count=complaint_entry.duplicate_report_count,
            is_cluster_root=complaint_entry.is_cluster_root,
            cluster_root_id=complaint_entry.cluster_root_id,
            status=complaint_entry.status,
            assigned_worker_name=complaint_entry.assigned_worker_name,
            resolution_notes=complaint_entry.resolution_notes,
            detected_hazards=complaint_entry.detected_hazards or [],
            recommended_action=complaint_entry.recommended_action,
            tags=complaint_entry.tags or [],
            created_at=complaint_entry.created_at,
            updated_at=complaint_entry.updated_at,
            resolved_at=complaint_entry.resolved_at
        ),
        matched_primary_id=primary_id,
        distance_meters=dist_m if is_dup else None,
        message=msg
    )

@router.get("/analytics/heatmap", response_model=HeatmapAnalyticsResponse)
async def get_complaints_heatmap(
    department: Optional[str] = Query(None, description="Filter by department e.g. ROAD_MAINTENANCE_PWD"),
    category: Optional[str] = Query(None, description="Filter by category e.g. ROAD_POTHOLE"),
    status: Optional[str] = Query(None, description="Filter by status (default active complaints)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns grouped geospatial heatmap points with intensity weights (0.0 - 1.0),
    severity metrics, and departmental distributions for Map Dashboards (Mapbox / Google Maps / Leaflet).
    """
    q = select(Complaint)
    if department:
        q = q.where(Complaint.department == department)
    if category:
        q = q.where(Complaint.category == category)
    if status:
        q = q.where(Complaint.status == status)
    else:
        q = q.where(Complaint.status.in_(["REPORTED", "ASSIGNED", "IN_PROGRESS"]))

    res = await db.execute(q)
    complaints = res.scalars().all()

    # Calculate distributions
    dept_dist = {}
    cat_dist = {}
    hotspots_count = 0

    # Cluster points by proximity rounding (~100m grid for fast dashboard visualization)
    clusters = {}
    for c in complaints:
        # Tally distributions
        dept_dist[c.department] = dept_dist.get(c.department, 0) + 1
        cat_dist[c.category] = cat_dist.get(c.category, 0) + 1
        if (c.priority_score or 0.0) >= 75.0 or (c.base_severity_score or 0) >= 8:
            hotspots_count += 1

        if c.latitude is not None and c.longitude is not None:
            # Round to ~3 decimal places (~110 meters precision grid cell)
            grid_key = (round(c.latitude, 3), round(c.longitude, 3), c.category)
            if grid_key not in clusters:
                clusters[grid_key] = []
            clusters[grid_key].append(c)

    heatmap_points = []
    for (grid_lat, grid_lon, cat), items in clusters.items():
        count = sum(item.duplicate_report_count for item in items)
        avg_sev = sum(item.base_severity_score for item in items) / len(items)
        avg_priority = sum(item.priority_score for item in items) / len(items)
        
        # Calculate normalized intensity weight (0.0 to 1.0)
        # Combines priority score, severity, and duplicate volume
        raw_weight = (avg_priority / 100.0) * 0.6 + min(0.4, (count * 0.08))
        norm_weight = round(min(1.0, max(0.1, raw_weight)), 2)

        representative = max(items, key=lambda x: x.priority_score)
        heatmap_points.append(HeatmapPoint(
            latitude=representative.latitude,
            longitude=representative.longitude,
            weight=norm_weight,
            severity=int(round(avg_sev)),
            priority_score=round(avg_priority, 1),
            complaint_count=count,
            category=representative.category,
            category_display_name=representative.category_display_name,
            department=representative.department,
            department_display_name=representative.department_display_name,
            location_address=representative.location_address,
            urgency_level=representative.urgency_level,
            sample_complaint_id=representative.id
        ))

    # Sort heatmap points by weight descending so most severe spots come first
    heatmap_points.sort(key=lambda p: p.weight, reverse=True)

    return HeatmapAnalyticsResponse(
        total_active_complaints=len(complaints),
        total_clusters=len(heatmap_points),
        critical_hotspots_count=hotspots_count,
        department_distribution=dept_dist,
        category_distribution=cat_dist,
        heatmap_points=heatmap_points
    )

@router.get("", response_model=List[ComplaintResponse])

async def list_complaints(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns complaints sorted dynamically by priority score descending.
    """
    q = select(Complaint)
    if department:
        q = q.where(Complaint.department == department)
    if status:
        q = q.where(Complaint.status == status)
    if category:
        q = q.where(Complaint.category == category)

    q = q.order_by(desc(Complaint.priority_score), desc(Complaint.created_at)).limit(limit)
    res = await db.execute(q)
    rows = res.scalars().all()
    
    return [
        ComplaintResponse(
            id=c.id,
            citizen_user_id=c.citizen_user_id,
            image_url=c.image_url,
            sanitized_image_url=c.sanitized_image_url,
            audio_url=c.audio_url,
            latitude=c.latitude,
            longitude=c.longitude,
            location_address=c.location_address,
            is_vulnerable_zone=c.is_vulnerable_zone,
            original_description=c.original_description,
            translated_description=c.translated_description,
            detected_language=c.detected_language,
            category=c.category,
            category_display_name=c.category_display_name,
            department=c.department,
            department_display_name=c.department_display_name,
            is_authentic_image=c.is_authentic_image,
            authenticity_probability=c.authenticity_probability,
            base_severity_score=c.base_severity_score,
            urgency_level=c.urgency_level,
            priority_score=c.priority_score,
            upvote_count=c.upvote_count,
            duplicate_report_count=c.duplicate_report_count,
            is_cluster_root=c.is_cluster_root,
            cluster_root_id=c.cluster_root_id,
            status=c.status,
            assigned_worker_name=c.assigned_worker_name,
            resolution_notes=c.resolution_notes,
            detected_hazards=c.detected_hazards or [],
            recommended_action=c.recommended_action,
            tags=c.tags or [],
            created_at=c.created_at,
            updated_at=c.updated_at,
            resolved_at=c.resolved_at
        )
        for c in rows
    ]

@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: str, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Complaint, complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintResponse(
        id=comp.id,
        citizen_user_id=comp.citizen_user_id,
        image_url=comp.image_url,
        sanitized_image_url=comp.sanitized_image_url,
        audio_url=comp.audio_url,
        latitude=comp.latitude,
        longitude=comp.longitude,
        location_address=comp.location_address,
        is_vulnerable_zone=comp.is_vulnerable_zone,
        original_description=comp.original_description,
        translated_description=comp.translated_description,
        detected_language=comp.detected_language,
        category=comp.category,
        category_display_name=comp.category_display_name,
        department=comp.department,
        department_display_name=comp.department_display_name,
        is_authentic_image=comp.is_authentic_image,
        authenticity_probability=comp.authenticity_probability,
        base_severity_score=comp.base_severity_score,
        urgency_level=comp.urgency_level,
        priority_score=comp.priority_score,
        upvote_count=comp.upvote_count,
        duplicate_report_count=comp.duplicate_report_count,
        is_cluster_root=comp.is_cluster_root,
        cluster_root_id=comp.cluster_root_id,
        status=comp.status,
        assigned_worker_name=comp.assigned_worker_name,
        resolution_notes=comp.resolution_notes,
        detected_hazards=comp.detected_hazards or [],
        recommended_action=comp.recommended_action,
        tags=comp.tags or [],
        created_at=comp.created_at,
        updated_at=comp.updated_at,
        resolved_at=comp.resolved_at
    )

@router.post("/{complaint_id}/upvote", response_model=UpvoteResponse)
async def upvote_complaint(
    complaint_id: str,
    user_id: str = Query("citizen_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Citizen upvote on existing complaint: Increments count and recalculates dynamic priority score.
    """
    comp = await db.get(Complaint, complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Record upvote
    comp.upvote_count += 1
    p_calc = calculate_dynamic_priority(
        base_severity=comp.base_severity_score,
        upvotes=comp.upvote_count,
        duplicate_count=comp.duplicate_report_count,
        created_at=comp.created_at,
        is_vulnerable_zone=comp.is_vulnerable_zone,
        urgency_level=comp.urgency_level
    )
    comp.priority_score = p_calc["priority_score"]

    up_rec = UpvoteRecord(complaint_id=comp.id, user_id=user_id)
    db.add(up_rec)
    await db.commit()

    return UpvoteResponse(
        complaint_id=comp.id,
        upvote_count=comp.upvote_count,
        new_priority_score=comp.priority_score,
        escalation_tier=p_calc["escalation_tier"],
        message=f"Upvote recorded. Priority score increased to {comp.priority_score}."
    )

@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: str,
    update_data: ComplaintStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Municipal worker status updater (e.g. mark IN_PROGRESS, RESOLVED).
    """
    comp = await db.get(Complaint, complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp.status = update_data.status
    if update_data.assigned_worker_id:
        comp.assigned_worker_id = update_data.assigned_worker_id
    if update_data.assigned_worker_name:
        comp.assigned_worker_name = update_data.assigned_worker_name
    if update_data.resolution_notes:
        comp.resolution_notes = update_data.resolution_notes
    if update_data.status.upper() == "RESOLVED":
        comp.resolved_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(comp)

    return ComplaintResponse(
        id=comp.id,
        citizen_user_id=comp.citizen_user_id,
        image_url=comp.image_url,
        sanitized_image_url=comp.sanitized_image_url,
        audio_url=comp.audio_url,
        latitude=comp.latitude,
        longitude=comp.longitude,
        location_address=comp.location_address,
        is_vulnerable_zone=comp.is_vulnerable_zone,
        original_description=comp.original_description,
        translated_description=comp.translated_description,
        detected_language=comp.detected_language,
        category=comp.category,
        category_display_name=comp.category_display_name,
        department=comp.department,
        department_display_name=comp.department_display_name,
        is_authentic_image=comp.is_authentic_image,
        authenticity_probability=comp.authenticity_probability,
        base_severity_score=comp.base_severity_score,
        urgency_level=comp.urgency_level,
        priority_score=comp.priority_score,
        upvote_count=comp.upvote_count,
        duplicate_report_count=comp.duplicate_report_count,
        is_cluster_root=comp.is_cluster_root,
        cluster_root_id=comp.cluster_root_id,
        status=comp.status,
        assigned_worker_name=comp.assigned_worker_name,
        resolution_notes=comp.resolution_notes,
        officer_proof_image_url=comp.officer_proof_image_url,
        reopen_count=comp.reopen_count or 0,
        escalated_to_supervisor=comp.escalated_to_supervisor or False,
        detected_hazards=comp.detected_hazards or [],
        recommended_action=comp.recommended_action,
        tags=comp.tags or [],
        created_at=comp.created_at,
        updated_at=comp.updated_at,
        resolved_at=comp.resolved_at
    )

@router.post("/{complaint_id}/resolve", response_model=ComplaintResponse)
async def officer_resolve_complaint(
    complaint_id: str,
    officer_proof_media_id: Optional[str] = Query(None, description="Media ID of officer's 'After/Fixed' proof photo"),
    assigned_worker_name: Optional[str] = Query("Municipal Junior Engineer"),
    resolution_notes: Optional[str] = Query("Issue repaired and verified on-site."),
    db: AsyncSession = Depends(get_db)
):
    """
    Municipal Officer marks complaint as RESOLVED with mandatory proof photo.
    """
    comp = await db.get(Complaint, complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    proof_url = None
    if officer_proof_media_id:
        rec = storage_service.get_media_record(officer_proof_media_id)
        if rec:
            proof_url = f"/uploads/original/{rec['filename']}"

    comp.status = "RESOLVED"
    comp.resolved_at = datetime.datetime.utcnow()
    comp.officer_proof_image_url = proof_url
    comp.assigned_worker_name = assigned_worker_name
    comp.resolution_notes = resolution_notes

    await db.commit()
    await db.refresh(comp)

    return ComplaintResponse(
        id=comp.id,
        citizen_user_id=comp.citizen_user_id,
        image_url=comp.image_url,
        sanitized_image_url=comp.sanitized_image_url,
        audio_url=comp.audio_url,
        latitude=comp.latitude,
        longitude=comp.longitude,
        location_address=comp.location_address,
        is_vulnerable_zone=comp.is_vulnerable_zone,
        original_description=comp.original_description,
        translated_description=comp.translated_description,
        detected_language=comp.detected_language,
        category=comp.category,
        category_display_name=comp.category_display_name,
        department=comp.department,
        department_display_name=comp.department_display_name,
        is_authentic_image=comp.is_authentic_image,
        authenticity_probability=comp.authenticity_probability,
        base_severity_score=comp.base_severity_score,
        urgency_level=comp.urgency_level,
        priority_score=comp.priority_score,
        upvote_count=comp.upvote_count,
        duplicate_report_count=comp.duplicate_report_count,
        is_cluster_root=comp.is_cluster_root,
        cluster_root_id=comp.cluster_root_id,
        status=comp.status,
        assigned_worker_name=comp.assigned_worker_name,
        resolution_notes=comp.resolution_notes,
        officer_proof_image_url=comp.officer_proof_image_url,
        reopen_count=comp.reopen_count or 0,
        escalated_to_supervisor=comp.escalated_to_supervisor or False,
        detected_hazards=comp.detected_hazards or [],
        recommended_action=comp.recommended_action,
        tags=comp.tags or [],
        created_at=comp.created_at,
        updated_at=comp.updated_at,
        resolved_at=comp.resolved_at
    )

@router.post("/{complaint_id}/verify-resolution", response_model=ResolutionVerificationResponse)
async def verify_citizen_resolution(
    complaint_id: str,
    request: CitizenVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Citizen Review Page: Confirm resolution OR Reject/Reopen with AI dispute verification.
    """
    comp = await db.get(Complaint, complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # If Citizen approves the resolution
    if request.action == DisputeActionEnum.APPROVE_RESOLUTION:
        comp.status = "RESOLVED"
        await db.commit()
        return ResolutionVerificationResponse(
            complaint_id=comp.id,
            decision=DisputeDecisionEnum.RESOLUTION_CONFIRMED,
            new_status="RESOLVED",
            escalated_to_supervisor=False,
            new_priority_score=comp.priority_score,
            reopen_count=comp.reopen_count or 0,
            is_rejection_photo_authentic=True,
            scene_similarity_score=1.0,
            issue_still_persists=False,
            explanation="Citizen verified and approved resolution. Ticket closed successfully."
        )

    # Citizen rejects / reopens ticket -> Run 4-Point AI Dispute Verification
    rejection_img_path = None
    if request.rejection_image_media_id:
        rec = storage_service.get_media_record(request.rejection_image_media_id)
        if rec:
            rejection_img_path = rec.get("sanitized_path") or rec.get("file_path")

    # Locate officer proof photo if available on disk
    officer_proof_path = None
    if comp.officer_proof_image_url:
        fname = os.path.basename(comp.officer_proof_image_url)
        officer_proof_path = os.path.join(settings.ORIGINAL_MEDIA_DIR, fname)

    dispute_res = await dispute_verifier.verify_dispute(
        original_lat=comp.latitude,
        original_lon=comp.longitude,
        officer_proof_image_path=officer_proof_path,
        rejection_image_path=rejection_img_path,
        rejection_lat=request.rejection_latitude,
        rejection_lon=request.rejection_longitude,
        category=comp.category_display_name or comp.category,
        original_description=comp.translated_description or comp.original_description or ""
    )

    decision = dispute_res["decision"]

    if decision == DisputeDecisionEnum.REOPEN_APPROVED:
        comp.status = "REOPENED_ESCALATED"
        comp.reopen_count = (comp.reopen_count or 0) + 1
        comp.escalated_to_supervisor = True
        # Boost priority score by +20 points for failed resolution
        comp.priority_score = min(100.0, (comp.priority_score or 50.0) + 20.0)
        
        # Log to dispute history
        history = list(comp.dispute_history or [])
        history.append({
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "citizen_user_id": request.citizen_user_id,
            "decision": decision.value,
            "rejection_media_id": request.rejection_image_media_id,
            "explanation": dispute_res["explanation"]
        })
        comp.dispute_history = history
        await db.commit()

        return ResolutionVerificationResponse(
            complaint_id=comp.id,
            decision=decision,
            new_status="REOPENED_ESCALATED",
            escalated_to_supervisor=True,
            new_priority_score=comp.priority_score,
            reopen_count=comp.reopen_count,
            is_rejection_photo_authentic=dispute_res["is_rejection_photo_authentic"],
            scene_similarity_score=dispute_res["scene_similarity_score"],
            issue_still_persists=dispute_res["issue_still_persists"],
            explanation=dispute_res["explanation"]
        )
    else:
        # Reopen was rejected (e.g. AI image or out of range)
        return ResolutionVerificationResponse(
            complaint_id=comp.id,
            decision=decision,
            new_status=comp.status,
            escalated_to_supervisor=False,
            new_priority_score=comp.priority_score,
            reopen_count=comp.reopen_count or 0,
            is_rejection_photo_authentic=dispute_res["is_rejection_photo_authentic"],
            scene_similarity_score=dispute_res["scene_similarity_score"],
            issue_still_persists=dispute_res["issue_still_persists"],
            explanation=dispute_res["explanation"]
        )

