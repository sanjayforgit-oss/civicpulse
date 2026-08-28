import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from backend.core.storage import storage_service
from backend.core.authenticity import authenticity_detector
from backend.core.sarvam import sarvam_engine
from backend.core.categorizer import categorizer_engine
from backend.schemas.analysis import (
    IssueCategorizationRequest,
    IssueCategorizationResponse,
    FullComplaintPipelineRequest,
    FullComplaintPipelineResponse
)

router = APIRouter(prefix="/ai", tags=["Multimodal AI & Department Routing"])

@router.post("/categorize-issue", response_model=IssueCategorizationResponse)
async def categorize_issue(request: IssueCategorizationRequest):
    """
    Multimodal classification & severity scoring based on image and/or text description.
    """
    image_path = None
    if request.image_media_id:
        record = storage_service.get_media_record(request.image_media_id)
        if not record:
            raise HTTPException(status_code=404, detail="Image media ID not found")
        # Use sanitized image if available, else original
        image_path = record.get("sanitized_path") or record.get("file_path")
    elif request.image_path:
        image_path = request.image_path

    # If audio note provided but no text description, auto-transcribe + translate
    desc_text = request.description_text
    if request.audio_media_id and not desc_text:
        audio_rec = storage_service.get_media_record(request.audio_media_id)
        if audio_rec:
            stt = await sarvam_engine.speech_to_text(audio_rec["file_path"])
            trans = await sarvam_engine.translate_text(stt["transcript"], source_language_code=stt["language_code"])
            desc_text = trans["translated_text"]

    result = await categorizer_engine.categorize_issue(
        image_path=image_path,
        description_text=desc_text,
        location_hint=request.location_hint
    )

    return result

@router.post("/full-complaint-pipeline", response_model=FullComplaintPipelineResponse)
async def full_complaint_pipeline(
    image_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    text_description: Optional[str] = Form(None),
    location_hint: Optional[str] = Form(None)
):
    """
    Complete All-in-One Complaint Pipeline:
    1. Uploads Image & Audio (extracts EXIF, redacts PII)
    2. Runs 3-Tier Fake / AI-Image Detection
    3. Runs Voice-to-Text & Translation (Sarvam AI)
    4. Runs Gemini Multimodal Categorization & Dynamic Department Routing
    """
    image_media_id = None
    image_path = None
    is_authentic = True
    auth_prob = 0.0

    # 1. Process Image if provided
    if image_file:
        img_rec = await storage_service.save_image(image_file)
        image_media_id = img_rec["media_id"]
        image_path = img_rec["sanitized_path"]
        
        # Check Authenticity
        auth_verdict = await authenticity_detector.validate_image(img_rec["file_path"])
        is_authentic = auth_verdict["is_authentic"]
        auth_prob = auth_verdict["ai_generated_probability"]

        if not is_authentic:
            # We return rejection if AI fake image
            cat_mock = await categorizer_engine.categorize_issue(description_text=text_description)
            return FullComplaintPipelineResponse(
                success=False,
                status="REJECTED_AI_GENERATED_IMAGE",
                media_id=image_media_id,
                is_authentic_image=False,
                authenticity_probability=auth_prob,
                original_text=text_description,
                translated_english_description=text_description,
                detected_language=None,
                categorization=cat_mock
            )

    # 2. Process Voice Note if provided
    original_text = text_description
    translated_text = text_description
    detected_lang = "en-IN"

    if audio_file:
        aud_rec = await storage_service.save_audio(audio_file)
        stt = await sarvam_engine.speech_to_text(aud_rec["file_path"])
        original_text = stt["transcript"]
        detected_lang = stt["language_code"]
        
        trans = await sarvam_engine.translate_text(
            input_text=original_text,
            source_language_code=detected_lang
        )
        translated_text = trans["translated_text"]
    elif text_description:
        # Check if text needs translation
        trans = await sarvam_engine.translate_text(text_description, source_language_code="auto")
        translated_text = trans["translated_text"]
        detected_lang = trans["source_language_code"]

    # 3. Categorization & Severity Routing
    cat_result = await categorizer_engine.categorize_issue(
        image_path=image_path,
        description_text=translated_text,
        location_hint=location_hint
    )

    return FullComplaintPipelineResponse(
        success=True,
        status="APPROVED_AND_CATEGORIZED",
        media_id=image_media_id,
        is_authentic_image=is_authentic,
        authenticity_probability=auth_prob,
        original_text=original_text,
        translated_english_description=translated_text,
        detected_language=detected_lang,
        categorization=cat_result
    )
