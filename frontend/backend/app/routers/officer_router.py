from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Issue, SiteInspection, WorkOrder, SLAPauseLog, EscalationRecord, AuditLog
from app.schemas import (
    AcceptTaskRequest, SiteInspectionRequest, BudgetApprovalRequest,
    BudgetDecisionRequest, CreateWorkOrderRequest, UpdateWorkProgressRequest,
    ResolutionEvidenceRequest, SLAPauseRequest, SLAModeRequest, StandardResponse
)
from app.security import get_current_user, require_roles, log_audit_event
from app.services.sla_engine import sla_engine

router = APIRouter(prefix="/officer", tags=["Officer Portal Operations"])

def log_officer_action(db: Session, officer: User, action: str, issue_id: str, prev_status: str, new_status: str, notes: str = None):
    """Creates a strict audit log entry for every officer action."""
    audit = AuditLog(
        user_id=officer.id,
        officer_id=officer.officer_id or officer.id,
        event_type="OFFICER_ACTION",
        action=action,
        previous_status=prev_status,
        new_status=new_status,
        details=f"Issue {issue_id}: {action} (From '{prev_status}' -> '{new_status}')",
        notes=notes
    )
    db.add(audit)
    db.commit()

# 1. GET OFFICER DASHBOARD METRICS & ASSIGNED COMPLAINTS
@router.get("/dashboard", response_model=StandardResponse)
def get_officer_dashboard(
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieves Officer operational workspace cards and assigned complaints list."""
    issues = db.query(Issue).all()
    
    now_utc = datetime.now(timezone.utc)
    
    def get_deadline_utc(iss):
        if not iss.sla_deadline:
            return None
        return iss.sla_deadline.replace(tzinfo=timezone.utc) if iss.sla_deadline.tzinfo is None else iss.sla_deadline

    # Calculate operational metrics using SLA Engine
    new_assignments = sum(1 for i in issues if i.workflow_state in ["ASSIGNED", "ACCEPTED"])
    high_priority = sum(1 for i in issues if i.ai_severity in ["HIGH", "CRITICAL"])
    in_progress = sum(1 for i in issues if i.workflow_state in ["IN_PROGRESS", "WORK_ORDER_CREATED"])
    overdue = sum(1 for i in issues if get_deadline_utc(i) and get_deadline_utc(i) < now_utc)
    sla_nearing = sum(1 for i in issues if get_deadline_utc(i) and now_utc <= get_deadline_utc(i) <= now_utc + timedelta(days=2))
    completed = sum(1 for i in issues if i.workflow_state in ["WORK_COMPLETED", "EVIDENCE_UPLOADED", "CLOSED"])


    formatted_issues = []
    for issue in issues:
        sla_calc = sla_engine.calculate_sla_metrics(issue)
        
        if sla_calc["status"] == "PAUSED":
            esc_display = f"⏸️ PAUSED ({issue.sla_pause_reason})"
        elif sla_calc["is_breached"]:
            esc_display = f"🚨 AUTO-ESCALATED (Level {issue.escalation_level})"
        elif sla_calc["status"] == "WARNING":
            esc_display = f"⚠️ APPROACHING DEADLINE ({sla_calc['time_remaining_str']})"
        else:
            esc_display = f"✅ ON TIME ({sla_calc['time_remaining_str']})"

        formatted_issues.append({
            "id": issue.id,
            "category": issue.ai_category or "Civic Infrastructure",
            "issue_type": issue.ai_issue_type or "General Defect",
            "original_description": issue.original_description or issue.description,
            "processed_description": issue.processed_description or issue.description,
            "latitude": issue.latitude,
            "longitude": issue.longitude,
            "location_ward": issue.location_ward,
            "photo_url": issue.media_url or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
            "priority": issue.ai_severity or "MEDIUM",
            "reports_count": issue.reports_count,
            "supporters_count": issue.supporters_count,
            "is_duplicate": issue.is_duplicate,
            "ai_confidence": issue.ai_confidence or 0.92,
            "workflow_state": issue.workflow_state,
            "budget_status": issue.budget_status,
            "estimated_cost": issue.estimated_cost,
            "available_budget": issue.available_department_budget,
            "sla_started_at": issue.sla_started_at.isoformat() if issue.sla_started_at else None,
            "sla_deadline": issue.sla_deadline.isoformat() if issue.sla_deadline else None,
            "sla_status": sla_calc["status"],
            "sla_time_remaining": sla_calc["time_remaining_str"],
            "sla_percentage_elapsed": sla_calc["percentage_elapsed"],
            "escalation_level": issue.escalation_level,
            "escalation_display": esc_display,
            "created_at": issue.created_at.isoformat()
        })

    return StandardResponse(
        success=True,
        message="Officer dashboard loaded successfully.",
        data={
            "officer_info": {
                "officer_id": current_user.officer_id or "OFF001",
                "name": current_user.name or "Municipal Officer",
                "designation": current_user.designation or "Assistant Engineer",
                "department": current_user.department_id or "HIGHWAYS",
                "role": current_user.role
            },
            "summary_cards": {
                "new_assignments": new_assignments,
                "high_priority": high_priority,
                "in_progress": in_progress,
                "sla_nearing_deadline": sla_nearing,
                "overdue": overdue,
                "completed": completed
            },
            "sla_mode": {
                "is_demo_mode": sla_engine.is_demo_mode,
                "active_policy_summary": "Demo Policy: 2 Mins for Critical/High, 5 Mins for Normal/Low" if sla_engine.is_demo_mode else "Real Policy: 15 Days for Critical/High, 30 Days for Normal/Low"
            },
            "assigned_complaints": formatted_issues,
            "assigned_issues": formatted_issues
        }
    )


# 2. SUPERVISOR ESCALATED COMPLAINTS VIEW
@router.get("/supervisor/escalations", response_model=StandardResponse)
def get_supervisor_escalated_complaints(
    current_user: User = Depends(require_roles(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    escalations = db.query(EscalationRecord).all()
    records = []
    for esc in escalations:
        issue = db.query(Issue).filter(Issue.id == esc.issue_id).first()
        records.append({
            "escalation_id": esc.escalation_id,
            "issue_id": esc.issue_id,
            "from_officer_id": esc.from_officer_id,
            "to_officer_id": esc.to_officer_id,
            "level": esc.level,
            "reason": esc.reason,
            "triggered_at": esc.triggered_at.isoformat(),
            "issue_category": issue.ai_category if issue else "Infrastructure",
            "issue_status": issue.status if issue else "UNKNOWN"
        })
    return StandardResponse(success=True, message="Supervisor escalation dashboard loaded.", data={"escalated_records": records})

# 3. SLA PAUSE ENDPOINT (AUDITED)
@router.post("/issues/{issue_id}/pause-sla", response_model=StandardResponse)
def pause_issue_sla(
    issue_id: str,
    payload: SLAPauseRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.sla_paused = True
    issue.sla_pause_reason = payload.pause_reason
    issue.sla_status = "PAUSED"

    pause_log = SLAPauseLog(
        issue_id=issue.id,
        officer_id=current_user.id,
        pause_reason=payload.pause_reason,
        notes=payload.notes
    )
    db.add(pause_log)
    db.commit()

    log_officer_action(db, current_user, "SLA_PAUSED", issue.id, "ACTIVE", "PAUSED", f"Reason: {payload.pause_reason}")

    return StandardResponse(success=True, message=f"SLA timer paused. Reason: {payload.pause_reason}")

# 4. ADMIN DEMO CLOCK TOGGLE ENDPOINT
@router.post("/sla/configure-mode", response_model=StandardResponse)
def configure_sla_demo_mode(
    payload: SLAModeRequest,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    sla_engine.is_demo_mode = payload.is_demo_mode
    return StandardResponse(
        success=True,
        message=f"SLA Engine mode updated to {'DEMO MODE (Shortened 2-min Clock)' if payload.is_demo_mode else 'REAL PRODUCTION MODE (15/30 Days)'}."
    )

# 5. IDEMPOTENT BACKGROUND JOB ESCALATION TRIGGER
@router.post("/sla/trigger-background-escalation", response_model=StandardResponse)
def trigger_background_sla_escalation(
    db: Session = Depends(get_db)
):
    escalated_count = sla_engine.evaluate_and_escalate_issues(db)
    return StandardResponse(
        success=True,
        message=f"SLA Background Job executed successfully. {escalated_count} issue(s) automatically escalated."
    )

# --- WORKFLOW ACTION ENDPOINTS ---
@router.post("/issues/{issue_id}/accept", response_model=StandardResponse)
def accept_task(
    issue_id: str,
    payload: AcceptTaskRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    prev = issue.workflow_state
    issue.workflow_state = "ACCEPTED"
    issue.assigned_officer_id = current_user.id
    db.commit()
    
    log_officer_action(db, current_user, "ACCEPT_TASK", issue.id, prev, "ACCEPTED", payload.notes)
    
    return StandardResponse(success=True, message=f"Task {issue_id} accepted successfully.")

@router.post("/issues/{issue_id}/submit-inspection", response_model=StandardResponse)
def submit_site_inspection(
    issue_id: str,
    payload: SiteInspectionRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    inspection = SiteInspection(
        issue_id=issue.id,
        officer_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        site_photo_url=payload.site_photo_url,
        problem_condition=payload.problem_condition,
        severity=payload.severity,
        dimensions=payload.dimensions,
        safety_risk=payload.safety_risk,
        required_materials=payload.required_materials,
        required_manpower=payload.required_manpower,
        preliminary_estimate=payload.preliminary_estimate,
        inspection_notes=payload.inspection_notes,
        recommended_action=payload.recommended_action
    )
    db.add(inspection)
    
    prev = issue.workflow_state
    issue.workflow_state = "SITE_INSPECTION"
    issue.estimated_cost = payload.preliminary_estimate
    
    if payload.preliminary_estimate > 20000.0:
        issue.budget_status = "BUDGET_CHECK_REQUIRED"
    db.commit()

    log_officer_action(db, current_user, "SITE_INSPECTION_SUBMITTED", issue.id, prev, "SITE_INSPECTION", payload.inspection_notes)

    return StandardResponse(success=True, message="Site inspection report recorded successfully.", data={"inspection_id": inspection.id})

@router.post("/issues/{issue_id}/request-budget", response_model=StandardResponse)
def request_budget_approval(
    issue_id: str,
    payload: BudgetApprovalRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    prev_budget = issue.budget_status
    issue.estimated_cost = payload.estimated_cost
    issue.budget_status = "AWAITING_APPROVAL"
    issue.workflow_state = "APPROVAL_PENDING"
    issue.budget_approval_notes = payload.reason
    db.commit()

    log_officer_action(db, current_user, "BUDGET_REQUEST_SUBMITTED", issue.id, prev_budget, "AWAITING_APPROVAL", payload.reason)

    return StandardResponse(success=True, message="Budget request submitted for Supervisor review.")

@router.post("/issues/{issue_id}/decide-budget", response_model=StandardResponse)
def decide_budget(
    issue_id: str,
    payload: BudgetDecisionRequest,
    current_user: User = Depends(require_roles(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if issue.assigned_officer_id == current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Self-Approval Violation: Officers cannot approve their own funding requests. Require Supervisor authorization.")

    prev_budget = issue.budget_status
    if payload.approved:
        if issue.estimated_cost > issue.available_department_budget:
            issue.budget_status = "FUNDS_UNAVAILABLE"
            db.commit()
            raise HTTPException(status_code=400, detail="Insufficient department budget available.")
        
        issue.budget_status = "APPROVED"
        issue.available_department_budget -= issue.estimated_cost
        issue.workflow_state = "WORK_ORDER_CREATED"
    else:
        issue.budget_status = "REJECTED"
        issue.workflow_state = "ACTION_REQUIRED"
        
    db.commit()

    log_officer_action(db, current_user, "BUDGET_DECISION", issue.id, prev_budget, issue.budget_status, payload.notes)

    return StandardResponse(success=True, message=f"Budget decision recorded: {issue.budget_status}")

@router.post("/issues/{issue_id}/create-work-order", response_model=StandardResponse)
def create_work_order(
    issue_id: str,
    payload: CreateWorkOrderRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    deadline = datetime.now(timezone.utc) + timedelta(days=payload.deadline_days)

    work_order = WorkOrder(
        issue_id=issue.id,
        created_by_officer_id=current_user.id,
        work_description=payload.work_description,
        materials=payload.materials,
        manpower=payload.manpower,
        estimated_cost=payload.estimated_cost,
        assigned_team=payload.assigned_team,
        deadline=deadline,
        priority=payload.priority,
        status="ASSIGNED"
    )
    db.add(work_order)
    
    prev = issue.workflow_state
    issue.workflow_state = "WORK_ORDER_CREATED"
    db.commit()

    log_officer_action(db, current_user, "WORK_ORDER_CREATED", issue.id, prev, "WORK_ORDER_CREATED", payload.work_description)

    return StandardResponse(success=True, message="Work order created successfully.", data={"work_order_id": work_order.id})

@router.post("/issues/{issue_id}/update-progress", response_model=StandardResponse)
def update_work_progress(
    issue_id: str,
    payload: UpdateWorkProgressRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    prev = issue.workflow_state
    if payload.status == "IN_PROGRESS":
        issue.workflow_state = "IN_PROGRESS"
    elif payload.status == "COMPLETED":
        issue.workflow_state = "WORK_COMPLETED"

    db.commit()

    log_officer_action(db, current_user, "WORK_PROGRESS_UPDATE", issue.id, prev, issue.workflow_state, payload.notes)

    return StandardResponse(success=True, message=f"Work status updated to {payload.status}")

@router.post("/issues/{issue_id}/submit-evidence", response_model=StandardResponse)
def submit_resolution_evidence(
    issue_id: str,
    payload: ResolutionEvidenceRequest,
    current_user: User = Depends(require_roles(["OFFICER", "SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    prev = issue.workflow_state
    issue.resolution_after_photo = payload.after_photo_url
    issue.resolution_notes = payload.completion_notes
    issue.completion_latitude = payload.completion_latitude
    issue.completion_longitude = payload.completion_longitude
    issue.resolved_at = datetime.now(timezone.utc)
    
    issue.workflow_state = "WAITING_FOR_CITIZEN_VERIFICATION"
    issue.status = "PENDING_CONFIRMATION"
    db.commit()

    log_officer_action(db, current_user, "EVIDENCE_SUBMITTED", issue.id, prev, "WAITING_FOR_CITIZEN_VERIFICATION", payload.completion_notes)

    return StandardResponse(
        success=True,
        message="Resolution evidence uploaded successfully. Issue submitted for Citizen Verification."
    )
