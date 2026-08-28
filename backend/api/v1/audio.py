import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from backend.core.config import settings
from backend.core.storage import storage_service
from backend.core.sarvam import sarvam_engine
from backend.schemas.audio import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranslationRequest,
    TranslationResponse,
    VoiceComplaintProcessResponse
)

router = APIRouter(prefix="/audio", tags=["Audio & Voice Translation (Sarvam AI)"])

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """
    Transcribes regional audio note using Sarvam AI STT (saaras model).
    """
    audio_path = None
    if request.media_id:
        record = storage_service.get_media_record(request.media_id)
        if not record:
            raise HTTPException(status_code=404, detail="Audio media ID not found")
        audio_path = record["file_path"]
    elif request.audio_url:
        audio_path = request.audio_url
    else:
        raise HTTPException(status_code=400, detail="Must provide either media_id or audio_url")

    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio file does not exist on disk: {audio_path}")

    res = await sarvam_engine.speech_to_text(
        audio_file_path=audio_path,
        language_code=request.language_code,
        model=request.model
    )

    return TranscriptionResponse(
        transcript=res["transcript"],
        language_code=res["language_code"],
        is_mock=res.get("is_mock", False)
    )

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translates vernacular text to English using Sarvam AI translation (mayura model).
    """
    res = await sarvam_engine.translate_text(
        input_text=request.input_text,
        source_language_code=request.source_language_code,
        target_language_code=request.target_language_code,
        mode=request.mode
    )

    return TranslationResponse(
        original_text=res["original_text"],
        translated_text=res["translated_text"],
        source_language_code=res["source_language_code"],
        target_language_code=res["target_language_code"],
        is_mock=res.get("is_mock", False)
    )

@router.post("/process-voice-complaint", response_model=VoiceComplaintProcessResponse)
async def process_voice_complaint(
    audio_file: Optional[UploadFile] = File(None),
    media_id: Optional[str] = Form(None),
    language_code: Optional[str] = Form("auto")
):
    """
    End-to-end voice processing: Uploads audio (or takes media_id), transcribes STT, and translates to English.
    """
    if audio_file:
        media_rec = await storage_service.save_audio(audio_file)
        target_media_id = media_rec["media_id"]
        audio_path = media_rec["file_path"]
    elif media_id:
        record = storage_service.get_media_record(media_id)
        if not record:
            raise HTTPException(status_code=404, detail="Audio media ID not found")
        target_media_id = media_id
        audio_path = record["file_path"]
    else:
        raise HTTPException(status_code=400, detail="Must provide audio_file or media_id")

    # Step 1: STT
    stt_res = await sarvam_engine.speech_to_text(audio_path, language_code=language_code)
    transcript = stt_res["transcript"]
    detected_lang = stt_res["language_code"]

    # Step 2: Translation to English
    translate_res = await sarvam_engine.translate_text(
        input_text=transcript,
        source_language_code=detected_lang,
        target_language_code="en-IN"
    )

    return VoiceComplaintProcessResponse(
        media_id=target_media_id,
        original_transcript=transcript,
        detected_language=detected_lang,
        translated_english_text=translate_res["translated_text"],
        is_mock=stt_res.get("is_mock", False) or translate_res.get("is_mock", False)
    )
