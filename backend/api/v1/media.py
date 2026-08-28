import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from backend.core.config import settings
from backend.core.storage import MediaStorageManager
from backend.core.privacy import extract_exif_metadata, apply_pii_redaction
from backend.schemas.media import MediaUploadResponse, GeoLocationMetadata, PIIRedactionSummary

router = APIRouter(prefix="/media", tags=["Media & Privacy Pipeline"])

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg", "audio/m4a", "audio/x-m4a"]

@router.post(
    "/upload",
    response_model=MediaUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload image or audio, extract EXIF metadata, and perform PII redaction"
)
async def upload_media(
    file: UploadFile = File(..., description="Image or voice note file to upload"),
    client_latitude: Optional[float] = Form(None, description="Optional GPS Latitude from device GPS"),
    client_longitude: Optional[float] = Form(None, description="Optional GPS Longitude from device GPS")
):
    content_type = file.content_type or ""
    is_image = any(content_type.startswith(t) for t in ["image/"]) or file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    is_audio = any(content_type.startswith(t) for t in ["audio/"]) or file.filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a'))
    
    if not (is_image or is_audio):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Please upload a valid image (JPEG/PNG/WEBP) or audio file."
        )
        
    # Save original uploaded file
    media_id, original_path, filename = await MediaStorageManager.save_upload_file(file, is_audio=is_audio)
    file_size = os.path.getsize(original_path)
    
    # Base URL construction for local serving
    original_url = f"/uploads/{'audio' if is_audio else 'original'}/{filename}"
    sanitized_url = None
    pii_summary = None
    exif_meta = {}
    
    final_lat = client_latitude
    final_lon = client_longitude
    
    if is_image:
        # Extract EXIF metadata
        exif_meta = extract_exif_metadata(original_path)
        if exif_meta.get("latitude") is not None and final_lat is None:
            final_lat = exif_meta["latitude"]
        if exif_meta.get("longitude") is not None and final_lon is None:
            final_lon = exif_meta["longitude"]
            
        # Apply PII Redaction & create sanitized public image
        sanitized_path = MediaStorageManager.get_sanitized_path(filename)
        redaction_stats = apply_pii_redaction(original_path, sanitized_path)
        
        sanitized_url = f"/uploads/sanitized/{filename}"
        pii_summary = PIIRedactionSummary(
            faces_blurred=redaction_stats["faces_blurred"],
            plates_blurred=redaction_stats["plates_blurred"],
            is_sanitized=True
        )
        
    return MediaUploadResponse(
        media_id=media_id,
        media_type="image" if is_image else "audio",
        original_url=original_url,
        sanitized_url=sanitized_url,
        file_size_bytes=file_size,
        mime_type=content_type or ("image/jpeg" if is_image else "audio/mpeg"),
        geolocation=GeoLocationMetadata(
            latitude=final_lat,
            longitude=final_lon,
            has_gps=bool(final_lat is not None and final_lon is not None)
        ),
        pii_redaction=pii_summary,
        camera_model=exif_meta.get("camera_model"),
        capture_timestamp=exif_meta.get("capture_timestamp")
    )
