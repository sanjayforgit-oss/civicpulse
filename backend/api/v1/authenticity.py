import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.core.config import settings
from backend.core.storage import MediaStorageManager
from backend.core.authenticity import ImageAuthenticityDetector
from backend.schemas.authenticity import ImageValidationRequest, ImageValidationResponse

router = APIRouter(prefix="/ai", tags=["AI Image Authenticity Engine"])

@router.post(
    "/validate-image",
    response_model=ImageValidationResponse,
    summary="Validate authenticity of an already uploaded image by media_id"
)
async def validate_uploaded_image(request: ImageValidationRequest):
    if not request.media_id and not request.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'media_id' or 'image_url' must be provided."
        )
        
    image_path = None
    if request.media_id:
        # Search for file in original media directory
        for f in os.listdir(settings.ORIGINAL_MEDIA_DIR):
            if f.startswith(request.media_id):
                image_path = os.path.join(settings.ORIGINAL_MEDIA_DIR, f)
                break
                
    elif request.image_url:
        filename = os.path.basename(request.image_url)
        candidate = os.path.join(settings.ORIGINAL_MEDIA_DIR, filename)
        if os.path.exists(candidate):
            image_path = candidate
        else:
            candidate_sanitized = os.path.join(settings.SANITIZED_MEDIA_DIR, filename)
            if os.path.exists(candidate_sanitized):
                image_path = candidate_sanitized

    if not image_path or not os.path.exists(image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target image not found for media_id='{request.media_id}'."
        )
        
    verdict = await ImageAuthenticityDetector.validate_image(image_path)
    verdict["media_id"] = request.media_id
    
    return ImageValidationResponse(**verdict)

@router.post(
    "/validate-image/direct",
    response_model=ImageValidationResponse,
    summary="Upload and immediately inspect an image for AI-generation / spoofing"
)
async def validate_direct_image(file: UploadFile = File(..., description="Direct image file to inspect")):
    # Save temporary upload to original
    media_id, file_path, filename = await MediaStorageManager.save_upload_file(file, is_audio=False)
    
    verdict = await ImageAuthenticityDetector.validate_image(file_path)
    verdict["media_id"] = media_id
    
    return ImageValidationResponse(**verdict)
