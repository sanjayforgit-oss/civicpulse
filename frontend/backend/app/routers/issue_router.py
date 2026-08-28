from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Issue, IssueSupport
from app.schemas import IssueCreateRequest, IssueResponse, TranscriptCorrectionRequest, ReopenRequest, PublicVerifyVoteRequest, StandardResponse
from app.security import get_current_user, log_audit_event
from app.services.sarvam_service import sarvam_service
from app.services.categorization_service import categorization_service
from app.services.deduplication_service import deduplication_engine
from app.services.verification_service import verification_service
from app.services.abuse_protection_service import abuse_protection_service
from app.services.file_security_service import file_security_service
from app.services.deduplication_service import haversine_distance_meters
from app.services.sla_engine import sla_engine

router = APIRouter(prefix="/issues", tags=["Civic Issues Intake & Resolution"])

def run_sarvam_and_ai_categorization_pipelines(issue: Issue, db: Session):
    """Executes Sarvam AI Voice STT/Translation & Gemini Multimodal AI Categorization Pipelines."""
    try:
        orig_text = issue.original_description or issue.description or ""
        voice_url = issue.voice_url
        lang = issue.original_language or "Tamil"

        voice_transcript = None
        if voice_url:
            voice_transcript, _ = sarvam_service.speech_to_text(voice_url, language=lang)
            issue.voice_transcript = voice_transcript

        text_to_translate = orig_text if orig_text else (voice_transcript if voice_transcript else "")
        if text_to_translate:
            if lang != "English":
                processed_text = sarvam_service.translate_text(text_to_translate, source_language=lang)
            else:
                processed_text = text_to_translate

        issue.processed_description = processed_text
        issue.description = processed_text
        issue.language_processing_status = "COMPLETED"

        ai_res = categorization_service.categorize_issue(
            image_url=issue.media_url,
            text_description=processed_text,
            voice_transcript=voice_transcript,
            location_ward=issue.location_ward
        )

        issue.ai_category = ai_res["category"]
        issue.ai_issue_type = ai_res["issue_type"]
        issue.ai_severity = ai_res["severity"]
        issue.ai_confidence = ai_res["confidence"]
        issue.ai_reason = ai_res["reason"]
        issue.ai_processed_at = datetime.now(timezone.utc)
        issue.ai_model_name = "gemini-2.5-flash"
        
        deadline, policy_id = sla_engine.calculate_deadline(ai_res["severity"], issue.sla_started_at or datetime.now(timezone.utc))
        issue.sla_deadline = deadline
        issue.sla_policy_id = policy_id

        if ai_res["confidence"] < 0.70:
            issue.ai_review_status = "AI_REVIEW_REQUIRED"
        else:
            issue.ai_review_status = "AUTO_APPROVED"

        db.commit()
        db.refresh(issue)
        deduplication_engine.evaluate_and_link_duplicate(issue, db)

    except Exception as e:
        issue.language_processing_status = "FAILED"
        db.commit()
        db.refresh(issue)

@router.post("/create", response_model=IssueResponse)
def create_issue(
    payload: IssueCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.offline_submission_id and payload.offline_submission_id.strip():
        existing = db.query(Issue).filter(Issue.offline_submission_id == payload.offline_submission_id.strip()).first()
        if existing:
            return existing

    if payload.media_url:
        file_security_service.validate_base64_media(payload.media_url)
    if payload.voice_url:
        file_security_service.validate_base64_media(payload.voice_url)

    has_photo = bool(payload.media_url and payload.media_url.strip())
    has_text = bool(payload.description and payload.description.strip())
    has_voice = bool(payload.voice_url and payload.voice_url.strip())

    if not (has_photo or has_text or has_voice):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint must contain at least a Photo, Text Description, or Voice recording."
        )

    if payload.description and len(payload.description) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text description exceeds maximum limit of 2000 characters."
        )

    if not (-90.0 <= payload.latitude <= 90.0 and -180.0 <= payload.longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GPS location coordinates."
        )

    raw_description = payload.description.strip() if payload.description else None
    orig_lang = payload.language or current_user.preferred_language or "English"

    abuse_eval = abuse_protection_service.calculate_spam_and_abuse_score(raw_description or "")
    review_status = "AUTO_APPROVED"
    if abuse_eval["spam_score"] > 0.60 or abuse_eval["abuse_score"] > 0.60:
        review_status = "SPAM_SUSPECTED"

    start_time = datetime.now(timezone.utc)
    initial_deadline, policy_id = sla_engine.calculate_deadline("NORMAL", start_time)

    default_officer = db.query(User).filter(User.officer_id == "OFF001").first()
    officer_id_to_assign = default_officer.id if default_officer else None

    new_issue = Issue(
        offline_submission_id=payload.offline_submission_id.strip() if payload.offline_submission_id else None,
        reporter_id=current_user.id,
        assigned_officer_id=officer_id_to_assign,
        original_description=raw_description,
        description=raw_description,
        original_language=orig_lang,
        language=orig_lang,
        processing_language="English",
        media_url=payload.media_url.strip() if payload.media_url else None,
        voice_url=payload.voice_url.strip() if payload.voice_url else None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_source=payload.location_source,
        location_accuracy=payload.location_accuracy,
        location_ward=payload.location_ward or "Ward General, Chennai",
        status="OPEN",
        sync_status="SYNCED",
        language_processing_status="PENDING",
        ai_review_status=review_status,
        spam_score=abuse_eval["spam_score"],
        abuse_score=abuse_eval["abuse_score"],
        is_duplicate=False,
        reports_count=1,
        supporters_count=1,
        sla_started_at=start_time,
        sla_deadline=initial_deadline,
        sla_policy_id=policy_id,
        sla_status="ON_TIME"
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    run_sarvam_and_ai_categorization_pipelines(new_issue, db)

    log_audit_event(
        db,
        event_type="ISSUE_CREATED",
        user_id=current_user.id,
        details=f"Issue {new_issue.id} created and routed to Officer OFF001.",
        ip_address=request.client.host
    )

    return new_issue

@router.get("/public-nearby", response_model=List[IssueResponse])
def get_public_nearby_issues(
    lat: float = 13.0827,
    lon: float = 80.2707,
    radius_km: float = 5.0,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Module 5 Server-Side Filtered Viewport Query for Public Markers (No PII)."""
    query = db.query(Issue).filter(Issue.is_duplicate == False)
    if category and category.upper() != "ALL":
        query = query.filter(Issue.ai_category == category.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Issue.status == status_filter.upper())
        
    all_issues = query.all()
    nearby = []
    for issue in all_issues:
        dist_m = haversine_distance_meters(lat, lon, issue.latitude, issue.longitude)
        if dist_m <= radius_km * 1000.0:
            nearby.append(issue)
    return nearby

@router.get("/heatmap-clusters")
def get_heatmap_clusters(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Module 5 Heatmap Aggregation Endpoint (Anonymized PII protection)."""
    query = db.query(Issue).filter(Issue.is_duplicate == False)
    if category and category.upper() != "ALL":
        query = query.filter(Issue.ai_category == category.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Issue.status == status_filter.upper())

    issues = query.all()
    points = []
    for i in issues:
        points.append({
            "id": i.id,
            "category": i.ai_category or "ROADS",
            "lat": i.latitude,
            "lon": i.longitude,
            "intensity": 0.9 if i.ai_severity == "CRITICAL" else 0.7 if i.ai_severity == "HIGH" else 0.5,
            "ward": i.location_ward,
            "status": i.status,
            "reports_count": i.reports_count,
            "created_at": i.created_at.isoformat()
        })
    return points

@router.post("/{issue_id}/verify-resolution", response_model=StandardResponse)
def verify_resolution(
    issue_id: str,
    payload: PublicVerifyVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if payload.confirmed:
        issue.citizen_confirmation_status = "CONFIRMED"
        issue.status = "RESOLVED"
        issue.workflow_state = "CLOSED"
    else:
        issue.citizen_confirmation_status = "REOPENED"
        issue.status = "OPEN"
        issue.workflow_state = "ASSIGNED"
        issue.reopen_reason = payload.note

    db.commit()
    return StandardResponse(success=True, message=f"Verification status updated to {issue.citizen_confirmation_status}")

@router.post("/{issue_id}/support", response_model=StandardResponse)
def support_public_issue(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue.supporters_count += 1
    db.commit()
    return StandardResponse(success=True, message="Thank you for supporting this community civic issue!", data={"supporters_count": issue.supporters_count})
