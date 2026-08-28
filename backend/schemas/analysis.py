from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CivicCategory(str, Enum):
    ROAD_POTHOLE = "ROAD_POTHOLE"
    OPEN_MANHOLE = "OPEN_MANHOLE"
    BROKEN_STREETLIGHT = "BROKEN_STREETLIGHT"
    GARBAGE_DUMP = "GARBAGE_DUMP"
    DRAINAGE_WATER_LEAKAGE = "DRAINAGE_WATER_LEAKAGE"
    FALLEN_TREE = "FALLEN_TREE"
    ILLEGAL_ENCROACHMENT = "ILLEGAL_ENCROACHMENT"
    STRAY_ANIMAL_HAZARD = "STRAY_ANIMAL_HAZARD"
    PUBLIC_PROPERTY_DAMAGE = "PUBLIC_PROPERTY_DAMAGE"
    OTHER_CIVIC_ISSUE = "OTHER_CIVIC_ISSUE"

class MunicipalDepartment(str, Enum):
    ROAD_MAINTENANCE_PWD = "ROAD_MAINTENANCE_PWD"
    SOLID_WASTE_MANAGEMENT = "SOLID_WASTE_MANAGEMENT"
    WATER_SUPPLY_SEWERAGE_BOARD = "WATER_SUPPLY_SEWERAGE_BOARD"
    ELECTRICITY_DISCOM = "ELECTRICITY_DISCOM"
    PARKS_HORTICULTURE = "PARKS_HORTICULTURE"
    TOWN_PLANNING_ENCROACHMENT = "TOWN_PLANNING_ENCROACHMENT"
    PUBLIC_HEALTH_SAFETY = "PUBLIC_HEALTH_SAFETY"
    GENERAL_MUNICIPAL_ADMIN = "GENERAL_MUNICIPAL_ADMIN"

class UrgencyLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IssueCategorizationRequest(BaseModel):
    image_media_id: Optional[str] = Field(None, description="Media ID of sanitized complaint image")
    image_path: Optional[str] = Field(None, description="Direct path or URL to image")
    description_text: Optional[str] = Field(None, description="Complaint text description (English or translated)")
    audio_media_id: Optional[str] = Field(None, description="Optional audio note media ID")
    location_hint: Optional[str] = Field(None, description="Optional location hint e.g. Main Street, Sector 4")

class IssueCategorizationResponse(BaseModel):
    category: CivicCategory = Field(..., description="Classified civic issue category")
    category_display_name: str = Field(..., description="Human-readable category title")
    department: MunicipalDepartment = Field(..., description="Designated routing municipal department")
    department_display_name: str = Field(..., description="Designated department name")
    
    # Severity & Priority Metrics
    base_severity_score: int = Field(..., ge=1, le=10, description="Calculated base severity score 1-10")
    urgency_level: UrgencyLevel = Field(..., description="Assessed urgency level")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Model classification confidence")
    
    # Actionable Insights
    detected_hazards: List[str] = Field(default_factory=list, description="Safety hazards identified")
    recommended_action: str = Field(..., description="Primary action municipal workers should take")
    ai_summary: str = Field(..., description="Concise AI generated issue summary")
    tags: List[str] = Field(default_factory=list, description="Automated classification tags")
    
    is_mock: bool = Field(False, description="Whether fallback mock heuristics were used")

class FullComplaintPipelineRequest(BaseModel):
    image_media_id: Optional[str] = Field(None, description="Media ID of uploaded photo")
    audio_media_id: Optional[str] = Field(None, description="Media ID of uploaded voice note")
    text_description: Optional[str] = Field(None, description="Optional text written by user")
    source_language: Optional[str] = Field("auto", description="Audio/text language code")

class FullComplaintPipelineResponse(BaseModel):
    success: bool
    status: str
    media_id: Optional[str]
    is_authentic_image: bool
    authenticity_probability: float
    original_text: Optional[str]
    translated_english_description: Optional[str]
    detected_language: Optional[str]
    categorization: IssueCategorizationResponse

class DisputeActionEnum(str, Enum):
    APPROVE_RESOLUTION = "APPROVE_RESOLUTION"
    REJECT_REOPEN = "REJECT_REOPEN"

class DisputeDecisionEnum(str, Enum):
    RESOLUTION_CONFIRMED = "RESOLUTION_CONFIRMED"
    REOPEN_APPROVED = "REOPEN_APPROVED"
    REOPEN_REJECTED_INVALID_PHOTO = "REOPEN_REJECTED_INVALID_PHOTO"
    REOPEN_REJECTED_AI_IMAGE = "REOPEN_REJECTED_AI_IMAGE"
    REOPEN_REJECTED_OUT_OF_RANGE = "REOPEN_REJECTED_OUT_OF_RANGE"

class CitizenVerificationRequest(BaseModel):
    action: DisputeActionEnum = Field(..., description="APPROVE_RESOLUTION or REJECT_REOPEN")
    citizen_user_id: Optional[str] = "citizen_user"
    feedback_notes: Optional[str] = None
    rejection_image_media_id: Optional[str] = Field(None, description="Media ID of citizen's proof photo if rejecting")
    rejection_latitude: Optional[float] = None
    rejection_longitude: Optional[float] = None

class ResolutionVerificationResponse(BaseModel):
    complaint_id: str
    decision: DisputeDecisionEnum
    new_status: str
    escalated_to_supervisor: bool
    new_priority_score: float
    reopen_count: int
    
    # 4-Point AI Verification Breakdown
    is_rejection_photo_authentic: bool
    scene_similarity_score: float = Field(..., description="0.0 to 1.0 visual scene correspondence")
    issue_still_persists: bool = Field(..., description="Whether the civic hazard is still visually present")
    explanation: str = Field(..., description="AI reasoning for supervisor or citizen")

