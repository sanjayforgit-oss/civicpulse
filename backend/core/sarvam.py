import os
import io
import json
import httpx
import logging

from typing import Dict, Any, Optional, Tuple
from backend.core.config import settings

logger = logging.getLogger("civicpulse.sarvam")

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate"

LANGUAGE_MAP = {
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "bn-IN": "Bengali",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "od-IN": "Odia",
    "en-IN": "English"
}

MOCK_TRANSLATION_DICT = {
    "सड़क": "road",
    "गड्ढा": "pothole",
    "कचरा": "garbage",
    "कूड़ा": "trash",
    "स्ट्रीट लाइट": "street light",
    "बिजली": "electricity",
    "पानी": "water",
    "नाली": "drainage",
    "मैनहोल": "manhole",
    "गंदा": "dirty",
    "साफ": "clean",
    "ரோடு": "road",
    "குப்பை": "garbage",
    "விளக்கு": "street light",
    "சாக்கடை": "drainage",
    "தண்ணீர்": "water",
    "சாலை": "road",
    "குழி": "pothole"
}

class SarvamEngine:
    @property
    def api_key(self) -> str:
        return settings.SARVAM_API_KEY.strip()

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))


    async def speech_to_text(
        self,
        audio_file_path: str,
        language_code: Optional[str] = None,
        model: str = "saaras:v3"
    ) -> Dict[str, Any]:
        """
        Transcribes audio file to text using Sarvam AI STT or Gemini 2.5 Flash Multimodal Audio.
        Accurately identifies Tamil, Hindi, Telugu, Kannada, Bengali, etc.
        """
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        # 1. Try Sarvam AI STT
        if self.is_configured():
            try:
                headers = {
                    "api-subscription-key": self.api_key
                }
                
                filename = os.path.basename(audio_file_path)
                with open(audio_file_path, "rb") as f:
                    file_bytes = f.read()

                files = {
                    "file": (filename, file_bytes, "audio/wav")
                }
                data = {
                    "model": "saaras:v3"
                }
                if language_code and language_code != "auto":
                    data["language_code"] = language_code

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        SARVAM_STT_URL,
                        headers=headers,
                        files=files,
                        data=data
                    )
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        transcript = res_json.get("transcript", "")
                        detected_lang = res_json.get("language_code", language_code or "hi-IN")
                        return {
                            "transcript": transcript,
                            "language_code": detected_lang,
                            "is_mock": False
                        }
                    else:
                        logger.warning(f"Sarvam STT returned {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Sarvam STT call failed: {e}")

        # 2. Try Gemini 2.5 Flash Multimodal Audio (Best-in-class Indian language recognition)
        gemini_key = settings.GEMINI_API_KEY.strip()
        if gemini_key and not gemini_key.startswith("your_"):
            try:
                import google.genai as genai
                from google.genai import types

                client = genai.Client(api_key=gemini_key)
                with open(audio_file_path, "rb") as f:
                    audio_bytes = f.read()

                ext = os.path.splitext(audio_file_path)[1].lower().replace(".", "")
                mime_map = {
                    "mp3": "audio/mp3",
                    "mpeg": "audio/mp3",
                    "wav": "audio/wav",
                    "m4a": "audio/mp4",
                    "ogg": "audio/ogg",
                    "aac": "audio/aac"
                }
                audio_mime = mime_map.get(ext, "audio/mp3")

                prompt = """
                Transcribe this audio recording accurately in its original spoken Indian language script.
                Detect the language (e.g. ta-IN, hi-IN, te-IN, kn-IN, bn-IN, mr-IN, en-IN).
                Respond strictly in JSON format:
                {
                    "transcript": "<original spoken text in native script>",
                    "language_code": "<ta-IN | hi-IN | te-IN | kn-IN | bn-IN | mr-IN | en-IN>"
                }
                """

                res = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime),
                        prompt
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )

                if res.text:
                    parsed = json.loads(res.text)
                    return {
                        "transcript": parsed.get("transcript", ""),
                        "language_code": parsed.get("language_code", "ta-IN"),
                        "is_mock": False
                    }
            except Exception as e:
                logger.error(f"Gemini Flash Audio STT failed: {e}")

        # 3. Fallback Simulation Engine
        return self._mock_speech_to_text(audio_file_path, language_code)


    async def translate_text(
        self,
        input_text: str,
        source_language_code: str = "auto",
        target_language_code: str = "en-IN",
        mode: str = "formal"
    ) -> Dict[str, Any]:
        """
        Translates text from regional Indian language to English using Sarvam mayura model.
        """
        if not input_text or not input_text.strip():
            return {
                "original_text": "",
                "translated_text": "",
                "source_language_code": source_language_code,
                "target_language_code": target_language_code,
                "is_mock": False
            }

        # If already English and source is explicitly en-IN or contains mostly ascii
        if (source_language_code == "en-IN" or (source_language_code == "auto" and all(ord(c) < 128 for c in input_text[:50]))):
            return {
                "original_text": input_text,
                "translated_text": input_text,
                "source_language_code": "en-IN",
                "target_language_code": target_language_code,
                "is_mock": False
            }

        if self.is_configured():
            try:
                headers = {
                    "Content-Type": "application/json",
                    "api-subscription-key": self.api_key
                }
                
                payload = {
                    "input": input_text,
                    "source_language_code": "hi-IN" if source_language_code == "auto" else source_language_code,
                    "target_language_code": target_language_code,
                    "mode": mode,
                    "model": "mayura:v1"
                }

                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(
                        SARVAM_TRANSLATE_URL,
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        translated_text = res_json.get("translated_text", "")
                        return {
                            "original_text": input_text,
                            "translated_text": translated_text,
                            "source_language_code": payload["source_language_code"],
                            "target_language_code": target_language_code,
                            "is_mock": False
                        }
                    else:
                        logger.warning(f"Sarvam Translate API returned {response.status_code}: {response.text}. Using fallback.")
            except Exception as e:
                logger.error(f"Sarvam Translate API call failed: {e}. Using fallback.")

        # Fallback Simulation
        return self._mock_translate_text(input_text, source_language_code, target_language_code)

    def _mock_speech_to_text(self, audio_path: str, lang: Optional[str]) -> Dict[str, Any]:
        """Provides realistic mock voice transcription for offline tests"""
        fname = os.path.basename(audio_path).lower()
        if "pothole" in fname or "road" in fname:
            return {
                "transcript": "यहाँ मेन रोड पर बहुत बड़ा गड्ढा है, गाड़ियाँ दुर्घटनाग्रस्त हो रही हैं।",
                "language_code": lang or "hi-IN",
                "is_mock": True
            }
        elif "garbage" in fname or "waste" in fname:
            return {
                "transcript": "இங்கு தெருவில் குப்பை அதிகம் குவிந்துள்ளது, உடனே அகற்றவும்.",
                "language_code": lang or "ta-IN",
                "is_mock": True
            }
        elif "light" in fname:
            return {
                "transcript": "గత వారం రోజులుగా మా వీధి దీపాలు పనిచేయడం లేదు.",
                "language_code": lang or "te-IN",
                "is_mock": True
            }
        else:
            return {
                "transcript": "यहाँ नाली का गंदा पानी सड़क पर बह रहा है और बदबू आ रही है।",
                "language_code": lang or "hi-IN",
                "is_mock": True
            }

    def _mock_translate_text(self, text: str, src_lang: str, tgt_lang: str) -> Dict[str, Any]:
        """Provides heuristic fallback translation for civic domain keywords"""
        lower_t = text.lower()
        translated = text
        
        if "गड्ढा" in text or "road" in lower_t or "குழி" in text:
            translated = "There is a very large pothole on the main road, vehicles are meeting with accidents."
            detected = "hi-IN" if "गड्ढा" in text else "ta-IN"
        elif "कचरा" in text or "कूड़ा" in text or "குப்பை" in text:
            translated = "A large pile of garbage has accumulated on the street, please clear it immediately."
            detected = "hi-IN" if "कचरा" in text else "ta-IN"
        elif "स्ट्रीट लाइट" in text or "దీపాలు" in text:
            translated = "The street lights in our lane have not been functioning for the past week."
            detected = "te-IN" if "దీపాలు" in text else "hi-IN"
        elif "नाली" in text or "पानी" in text or "சாக்கடை" in text:
            translated = "Dirty sewage drain water is overflowing onto the road causing foul smell."
            detected = "hi-IN" if "नाली" in text else "ta-IN"
        else:
            translated = f"[Translated]: {text}"
            detected = src_lang if src_lang != "auto" else "hi-IN"

        return {
            "original_text": text,
            "translated_text": translated,
            "source_language_code": detected,
            "target_language_code": tgt_lang,
            "is_mock": True
        }

sarvam_engine = SarvamEngine()
