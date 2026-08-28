from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class GeoLocationMetadata(BaseModel):
    latitude: Optional[float] = Field(None, description="GPS Latitude extracted from EXIF or provided by client")
    longitude: Optional[float] = Field(None, description="GPS Longitude extracted from EXIF or provided by client")
    has_gps: bool = Field(False, description="True if valid GPS coordinates are present")

class PIIRedactionSummary(BaseModel):
    faces_blurred: int = Field(0, description="Number of human faces detected and blurred")
    plates_blurred: int = Field(0, description="Number of vehicle license plates detected and blurred")
    is_sanitized: bool = Field(True, description="Whether the public image was stripped of EXIF and redacted")

class MediaUploadResponse(BaseModel):
    media_id: str = Field(..., description="Unique ID for the media asset")
    media_type: str = Field(..., description="'image' or 'audio'")
    original_url: str = Field(..., description="Internal URL to original file (restricted to authorized officers)")
    sanitized_url: Optional[str] = Field(None, description="Public-safe URL with PII blurred and EXIF stripped")
    file_size_bytes: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type of uploaded file")
    geolocation: GeoLocationMetadata
    pii_redaction: Optional[PIIRedactionSummary] = None
    camera_model: Optional[str] = None
    capture_timestamp: Optional[str] = None
