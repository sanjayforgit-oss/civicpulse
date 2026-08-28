from typing import Optional, List
from pydantic import BaseModel, Field

class TranscriptionRequest(BaseModel):
    media_id: Optional[str] = Field(None, description="Media ID of previously uploaded audio")
    audio_url: Optional[str] = Field(None, description="URL or relative path to audio file")
    language_code: Optional[str] = Field(None, description="BCP 47 language code e.g. hi-IN, ta-IN, te-IN, kn-IN, bn-IN, mr-IN, en-IN")
    model: str = Field("saaras:v2", description="Sarvam model name e.g. saaras:v2")

class TranscriptionResponse(BaseModel):
    transcript: str = Field(..., description="Transcribed regional text")
    language_code: str = Field(..., description="Detected or provided language code")
    duration_seconds: Optional[float] = Field(None, description="Audio duration in seconds")
    confidence: Optional[float] = Field(None, description="Confidence score if available")
    is_mock: bool = Field(False, description="Whether fallback mock engine was used")

class TranslationRequest(BaseModel):
    input_text: str = Field(..., description="Source text to translate")
    source_language_code: str = Field("auto", description="Source language code (e.g. hi-IN, ta-IN, te-IN, bn-IN, auto)")
    target_language_code: str = Field("en-IN", description="Target language code (default en-IN)")
    mode: str = Field("formal", description="Translation mode: formal or code-mixed")

class TranslationResponse(BaseModel):
    original_text: str = Field(..., description="Original input text")
    translated_text: str = Field(..., description="Translated English text")
    source_language_code: str = Field(..., description="Source language code used")
    target_language_code: str = Field(..., description="Target language code")
    is_mock: bool = Field(False, description="Whether fallback mock engine was used")

class VoiceComplaintProcessResponse(BaseModel):
    media_id: str
    original_transcript: str
    detected_language: str
    translated_english_text: str
    duration_seconds: Optional[float] = None
    is_mock: bool = False
