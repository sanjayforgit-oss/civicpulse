import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ComplaintCreateRequest(BaseModel):
    citizen_user_id: Optional[str] = Field("anonymous_citizen", description="Citizen or device identifier")
    image_media_id: Optional[str] = Field(None, description="Media ID of uploaded photo")
    audio_media_id: Optional[str] = Field(None, description="Media ID of uploaded voice note")
    text_description: Optional[str] = Field(None, description="Citizen text description")
    latitude: Optional[float] = Field(None, description="GPS Latitude")
    longitude: Optional[float] = Field(None, description="GPS Longitude")
    location_address: Optional[str] = Field(None, description="Location text or landmark")
    is_vulnerable_zone: bool = Field(False, description="Flag for hospital, school, or heavy junction zone")

class ComplaintStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="REPORTED, ASSIGNED, IN_PROGRESS, RESOLVED, REJECTED")
    assigned_worker_id: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    resolution_notes: Optional[str] = None

class UpvoteResponse(BaseModel):
    complaint_id: str
    upvote_count: int
    new_priority_score: float
    escalation_tier: str
    message: str

class ComplaintResponse(BaseModel):
    id: str
    citizen_user_id: str
    image_url: Optional[str] = None
    sanitized_image_url: Optional[str] = None
    audio_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    is_vulnerable_zone: bool = False
    
    original_description: Optional[str] = None
    translated_description: Optional[str] = None
    detected_language: Optional[str] = None
    
    category: str
    category_display_name: str
    department: str
    department_display_name: str
    
    is_authentic_image: bool
    authenticity_probability: float
    base_severity_score: int
    urgency_level: str
    
    priority_score: float
    upvote_count: int
    duplicate_report_count: int
    
    is_cluster_root: bool
    cluster_root_id: Optional[str] = None
    
    status: str
    assigned_worker_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    officer_proof_image_url: Optional[str] = None
    reopen_count: int = 0
    escalated_to_supervisor: bool = False
    detected_hazards: List[str] = []
    recommended_action: Optional[str] = None
    tags: List[str] = []
    
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None


class ComplaintSubmitResult(BaseModel):
    success: bool
    is_duplicate: bool
    complaint: ComplaintResponse
    matched_primary_id: Optional[str] = None
    distance_meters: Optional[float] = None
    message: str

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float = Field(..., description="Normalized heat intensity (0.0 to 1.0) based on severity, upvotes, and duplicate clusters")
    severity: int = Field(..., description="Average base severity score 1-10")
    priority_score: float = Field(..., description="Average priority score 0-100")
    complaint_count: int = Field(..., description="Number of grouped complaint reports in this coordinate cluster")
    category: str = Field(..., description="Primary civic issue category")
    category_display_name: str
    department: str
    department_display_name: str
    location_address: Optional[str] = None
    urgency_level: str
    sample_complaint_id: str

class HeatmapAnalyticsResponse(BaseModel):
    total_active_complaints: int
    total_clusters: int
    critical_hotspots_count: int
    department_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    heatmap_points: List[HeatmapPoint]

