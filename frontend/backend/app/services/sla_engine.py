from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Issue, User, EscalationRecord, SLAPolicy, AuditLog

# Default SLA Policies
DEFAULT_SLA_POLICIES = {
    "EMERGENCY": {"resolution_days": 15, "demo_minutes": 2},
    "CRITICAL": {"resolution_days": 15, "demo_minutes": 2},
    "HIGH": {"resolution_days": 15, "demo_minutes": 2},
    "NORMAL": {"resolution_days": 30, "demo_minutes": 5},
    "LOW": {"resolution_days": 30, "demo_minutes": 5}
}

class SLAEngine:
    def __init__(self):
        self.is_demo_mode = True # Default demo mode enabled for hackathon

    def calculate_deadline(self, severity: str, started_at: datetime = None) -> tuple[datetime, str]:
        """Calculates SLA deadline based on policy (Real Days vs Demo Minutes)."""
        if not started_at:
            started_at = datetime.now(timezone.utc)

        sev_key = (severity or "NORMAL").upper()
        policy = DEFAULT_SLA_POLICIES.get(sev_key, DEFAULT_SLA_POLICIES["NORMAL"])

        if self.is_demo_mode:
            deadline = started_at + timedelta(minutes=policy["demo_minutes"])
        else:
            deadline = started_at + timedelta(days=policy["resolution_days"])

        return deadline, f"SLA-POL-{sev_key}"

    def calculate_sla_metrics(self, issue: Issue) -> dict:
        """Calculates time remaining, percentage elapsed, and SLA status."""
        if not issue.sla_deadline:
            return {"time_remaining_str": "No Deadline", "percentage_elapsed": 0.0, "status": "ON_TIME"}

        now = datetime.now(timezone.utc)
        if issue.sla_deadline.tzinfo is None:
            issue_deadline = issue.sla_deadline.replace(tzinfo=timezone.utc)
        else:
            issue_deadline = issue.sla_deadline

        if issue.sla_started_at:
            start_time = issue.sla_started_at.replace(tzinfo=timezone.utc) if issue.sla_started_at.tzinfo is None else issue.sla_started_at
        else:
            start_time = issue.created_at.replace(tzinfo=timezone.utc) if issue.created_at.tzinfo is None else issue.created_at

        total_duration = (issue_deadline - start_time).total_seconds()
        elapsed_duration = (now - start_time).total_seconds()
        remaining_duration = (issue_deadline - now).total_seconds()

        percentage_elapsed = min(100.0, max(0.0, (elapsed_duration / total_duration) * 100.0)) if total_duration > 0 else 100.0

        if remaining_duration <= 0:
            status = "BREACHED" if issue.escalation_level == 0 else "ESCALATED"
            rem_str = "BREACHED"
        elif remaining_duration <= total_duration * 0.20:
            status = "WARNING"
            rem_str = f"{int(remaining_duration // 60)} mins remaining" if self.is_demo_mode else f"{int(remaining_duration // 86400)} days remaining"
        else:
            status = "ON_TIME"
            rem_str = f"{int(remaining_duration // 60)} mins remaining" if self.is_demo_mode else f"{int(remaining_duration // 86400)} days remaining"

        if issue.sla_paused:
            status = "PAUSED"
            rem_str = f"PAUSED ({issue.sla_pause_reason})"

        return {
            "time_remaining_str": rem_str,
            "percentage_elapsed": round(percentage_elapsed, 1),
            "status": status,
            "is_breached": remaining_duration <= 0
        }

    def evaluate_and_escalate_issues(self, db: Session) -> int:
        """Idempotent background job engine for automatic SLA escalation."""
        active_issues = db.query(Issue).filter(
            Issue.status.in_(["OPEN", "PROCESSING", "IN_PROGRESS", "ACCEPTED", "SITE_INSPECTION"]),
            Issue.sla_paused == False
        ).all()

        escalated_count = 0
        now = datetime.now(timezone.utc)

        for issue in active_issues:
            if not issue.sla_deadline:
                continue

            deadline = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline

            if now >= deadline:
                # Check if already escalated to prevent duplicates
                existing_record = db.query(EscalationRecord).filter(
                    EscalationRecord.issue_id == issue.id,
                    EscalationRecord.level == issue.escalation_level + 1
                ).first()

                if not existing_record:
                    current_officer = db.query(User).filter(User.id == issue.assigned_officer_id).first() if issue.assigned_officer_id else None
                    
                    # Determine next level officer via supervisor_id hierarchy
                    next_officer = None
                    if current_officer and current_officer.supervisor_id:
                        next_officer = db.query(User).filter(User.id == current_officer.supervisor_id).first()
                    
                    if not next_officer:
                        # Fallback to Zonal Supervisor / Admin
                        next_officer = db.query(User).filter(User.role.in_(["SUPERVISOR", "ADMIN"])).first()

                    next_officer_id = next_officer.id if next_officer else (current_officer.id if current_officer else "OFF-SUPERVISOR-DEFAULT")
                    next_level = issue.escalation_level + 1

                    # 1. Create Escalation Record
                    esc_record = EscalationRecord(
                        issue_id=issue.id,
                        from_officer_id=issue.assigned_officer_id,
                        to_officer_id=next_officer_id,
                        level=next_level,
                        reason="SLA automatically breached.",
                        triggered_at=now,
                        status="ESCALATED"
                    )
                    db.add(esc_record)

                    # 2. Update Issue State
                    issue.escalation_level = next_level
                    issue.assigned_officer_id = next_officer_id
                    issue.sla_status = "ESCALATED"
                    issue.escalation_status = f"BREACHED_LEVEL_{next_level}_AUTO_ESCALATED"

                    # 3. Create Audit Trail
                    audit = AuditLog(
                        user_id="SYSTEM_SLA_ENGINE",
                        officer_id=next_officer_id,
                        event_type="AUTO_ESCALATION",
                        action="SLA_AUTO_ESCALATED",
                        previous_status="ON_TIME",
                        new_status=f"ESCALATED_LEVEL_{next_level}",
                        details=f"SLA automatically breached for Issue {issue.id}. Re-routed to Supervisor ({next_officer_id}).",
                        notes="System-triggered escalation."
                    )
                    db.add(audit)
                    escalated_count += 1

        db.commit()
        return escalated_count

sla_engine = SLAEngine()
