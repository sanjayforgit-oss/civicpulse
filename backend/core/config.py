import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS settings (supporting Flutter dev & Next.js web ports)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Storage Paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    ORIGINAL_MEDIA_DIR: str = os.path.join(UPLOAD_DIR, "original")
    SANITIZED_MEDIA_DIR: str = os.path.join(UPLOAD_DIR, "sanitized")
    AUDIO_MEDIA_DIR: str = os.path.join(UPLOAD_DIR, "audio")
    
    # AI API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    
    # Privacy & Detection Thresholds
    AI_DETECTION_CONFIDENCE_THRESHOLD: float = 0.65
    FFT_ANOMALY_THRESHOLD: float = 0.72
    MAX_IMAGE_SIZE_MB: int = 15
    MAX_AUDIO_SIZE_MB: int = 25
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        extra="allow"
    )

settings = Settings()

# Also fallback to direct dotenv or os.getenv if BaseSettings doesn't pick it up
if not settings.SARVAM_API_KEY or not settings.GEMINI_API_KEY:
    env_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_file_path):
        with open(env_file_path, "r") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if k == "SARVAM_API_KEY" and not settings.SARVAM_API_KEY:
                        settings.SARVAM_API_KEY = v
                    elif k == "GEMINI_API_KEY" and not settings.GEMINI_API_KEY:
                        settings.GEMINI_API_KEY = v


# Ensure upload directories exist
os.makedirs(settings.ORIGINAL_MEDIA_DIR, exist_ok=True)
os.makedirs(settings.SANITIZED_MEDIA_DIR, exist_ok=True)
os.makedirs(settings.AUDIO_MEDIA_DIR, exist_ok=True)
