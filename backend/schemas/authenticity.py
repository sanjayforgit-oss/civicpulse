from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ImageValidationRequest(BaseModel):
    media_id: Optional[str] = Field(None, description="Media ID of an already uploaded image")
    image_url: Optional[str] = Field(None, description="URL or relative path to image to validate")

class ImageValidationResponse(BaseModel):
    media_id: Optional[str] = None
    is_authentic: bool = Field(..., description="True if image is a real camera photo, False if AI generated")
    ai_generated_probability: float = Field(..., description="Calculated probability that the image is AI-generated (0.0 - 1.0)")
    confidence_score: float = Field(..., description="Confidence of the authenticity engine")
    status: str = Field(..., description="'APPROVED' or 'REJECTED_AI_GENERATED'")
    flags: List[str] = Field(default_factory=list, description="Detected anomalies, watermarks, or signatures")
    reasons: List[str] = Field(default_factory=list, description="Detailed explanation of the verdict")
    tier_breakdown: Optional[Dict[str, Any]] = Field(None, description="Detailed metrics across Tier 1, Tier 2, and Tier 3")
