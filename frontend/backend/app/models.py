import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    officer_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    department_id = Column(String, nullable=True)
    zone_id = Column(String, nullable=True)
    ward_id = Column(String, nullable=True)
    supervisor_id = Column(String, nullable=True)
    
    mobile = Column(String, nullable=True)
    preferred_language = Column(String, default="English", nullable=False)
    identity_verified = Column(Boolean, default=False, nullable=False)
    identity_reference = Column(String, nullable=True, index=True)
    role = Column(String, default="CITIZEN", nullable=False) # CITIZEN, OFFICER, SUPERVISOR, ADMIN
    account_status = Column(String, default="ACTIVE", nullable=False) # ACTIVE, PENDING, SUSPENDED
    account_reputation = Column(Float, default=1.0, nullable=False)
    device_reputation = Column(Float, default=1.0, nullable=False)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class MockIdentity(Base):
    __tablename__ = "mock_identity"

    identity_reference = Column(String, primary_key=True, index=True)
    mock_identity_hash = Column(String, unique=True, index=True, nullable=False)
    registered_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    is_registered = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class OTPStore(Base):
    __tablename__ = "otp_store"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    attempts = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class IssueSupport(Base):
    __tablename__ = "issue_supports"

    id = Column(String, primary_key=True, default=generate_uuid)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# --- MODULE 3 SLA POLICIES & ESCALATIONS ---
class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    severity_level = Column(String, unique=True, nullable=False) # CRITICAL, HIGH, NORMAL, LOW
    resolution_days = Column(Integer, nullable=False)
    demo_resolution_minutes = Column(Integer, default=2, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class EscalationRecord(Base):
    __tablename__ = "escalation_records"

    escalation_id = Column(String, primary_key=True, default=generate_uuid)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    from_officer_id = Column(String, nullable=True)
    to_officer_id = Column(String, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    reason = Column(String, default="SLA automatically breached.", nullable=False)
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="ESCALATED", nullable=False)

class SLAPauseLog(Base):
    __tablename__ = "sla_pause_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    officer_id = Column(String, nullable=False)
    pause_reason = Column(String, nullable=False) # AWAITING_APPROVAL, AWAITING_EXTERNAL_AGENCY, COURT_HOLD, NATURAL_DISASTER, MATERIAL_UNAVAILABLE
    notes = Column(Text, nullable=True)
    paused_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resumed_at = Column(DateTime, nullable=True)

class SiteInspection(Base):
    __tablename__ = "site_inspections"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    officer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    site_photo_url = Column(Text, nullable=True)
    problem_condition = Column(Text, nullable=False)
    severity = Column(String, default="MEDIUM", nullable=False)
    dimensions = Column(String, nullable=True)
    safety_risk = Column(String, default="LOW", nullable=False)
    required_materials = Column(Text, nullable=True)
    required_manpower = Column(Integer, default=2, nullable=False)
    preliminary_estimate = Column(Float, default=0.0, nullable=False)
    inspection_notes = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(String, primary_key=True, default=lambda: f"WO-{uuid.uuid4().hex[:6].upper()}", index=True)
    issue_id = Column(String, ForeignKey("issues.id"), nullable=False, index=True)
    created_by_officer_id = Column(String, ForeignKey("users.id"), nullable=False)
    work_description = Column(Text, nullable=False)
    materials = Column(Text, nullable=True)
    manpower = Column(Integer, default=2, nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    assigned_team = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=False)
    priority = Column(String, default="MEDIUM", nullable=False)
    status = Column(String, default="ASSIGNED", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# --- ISSUE DATA MODEL ---
class Issue(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, default=lambda: f"TN-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}", index=True)
    offline_submission_id = Column(String, unique=True, index=True, nullable=True)
    reporter_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    assigned_officer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(String, default="HIGHWAYS", nullable=True)
    
    # Dual-Text & Sarvam AI Language Fields
    original_description = Column(Text, nullable=True)
    processed_description = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    original_language = Column(String, default="English", nullable=False)
    processing_language = Column(String, default="English", nullable=False)
    language = Column(String, default="English", nullable=False)
    
    voice_url = Column(Text, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    language_processing_status = Column(String, default="PENDING", nullable=False)
    
    # Module 6 AI Categorization Fields
    ai_category = Column(String, nullable=True)
    ai_issue_type = Column(String, nullable=True)
    ai_severity = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_reason = Column(Text, nullable=True)
    ai_processed_at = Column(DateTime, nullable=True)
    ai_model_name = Column(String, default="gemini-2.5-flash", nullable=False)
    ai_review_status = Column(String, default="AUTO_APPROVED", nullable=False)

    # Module 7 Duplicate Detection Fields
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_id = Column(String, ForeignKey("issues.id"), nullable=True, index=True)
    reports_count = Column(Integer, default=1, nullable=False)
    supporters_count = Column(Integer, default=1, nullable=False)
    duplicate_score = Column(Float, nullable=True)
    duplicate_confidence_breakdown = Column(Text, nullable=True)

    # Officer Portal Workflow & Budget Fields
    workflow_state = Column(String, default="ASSIGNED", nullable=False) 
    budget_status = Column(String, default="BUDGET_NOT_REQUIRED", nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    available_department_budget = Column(Float, default=500000.0, nullable=False)
    budget_approval_notes = Column(Text, nullable=True)
    
    # Module 3 Automatic SLA Engine Fields
    sla_started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sla_deadline = Column(DateTime, nullable=True)
    sla_policy_id = Column(String, nullable=True)
    sla_status = Column(String, default="ON_TIME", nullable=False) # ON_TIME, WARNING, BREACHED, ESCALATED, PAUSED
    sla_paused = Column(Boolean, default=False, nullable=False)
    sla_pause_reason = Column(String, nullable=True)
    
    escalation_level = Column(Integer, default=0, nullable=False)
    escalation_status = Column(String, default="NONE", nullable=False) # NONE, WARNING_APPROACHING, BREACHED_AUTO_ESCALATED

    # Module 9 Resolution & Verification Fields
    resolution_before_photo = Column(Text, nullable=True)
    resolution_after_photo = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    completion_latitude = Column(Float, nullable=True)
    completion_longitude = Column(Float, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    citizen_confirmation_status = Column(String, default="PENDING", nullable=False)
    
    reopen_reason = Column(Text, nullable=True)
    reopen_proof_photo = Column(Text, nullable=True)
    
    verification_score = Column(Float, nullable=True)
    verification_reason = Column(Text, nullable=True)
    verification_status = Column(String, default="NONE", nullable=False)
    public_verification_eligible = Column(Boolean, default=False, nullable=False)

    # Module 10 Security & Abuse Fields
    spam_score = Column(Float, default=0.0, nullable=False)
    abuse_score = Column(Float, default=0.0, nullable=False)

    media_url = Column(Text, nullable=True)
    
    # Location fields
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_source = Column(String, default="GPS", nullable=False)
    location_accuracy = Column(Float, nullable=True)
    location_ward = Column(String, default="Ward General", nullable=False)

    status = Column(String, default="OPEN", nullable=False)
    sync_status = Column(String, default="SYNCED", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True)
    officer_id = Column(String, nullable=True)
    event_type = Column(String, nullable=False)
    action = Column(String, nullable=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
