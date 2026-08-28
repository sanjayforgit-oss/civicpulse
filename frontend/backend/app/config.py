import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicpulse_super_secret_jwt_key_2026_prototype")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Sarvam AI API Configuration
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "demo_sarvam_api_key_2026")
    SARVAM_BASE_URL: str = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")
    
    # Gemini Multimodal AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "demo_gemini_api_key_2026")
    GEMINI_MODEL_NAME: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civicpulse.db")
    
    # Demo Identity Seed Values
    DEMO_IDENTITIES: list = [
        "900100001234",
        "900100001235",
        "900100001236",
        "900100001237"
    ]
    
    # Rate Limiting
    OTP_RATE_LIMIT_MINUTES: int = 1
    MAX_OTP_ATTEMPTS: int = 3
    MAX_LOGIN_ATTEMPTS: int = 5

    class Config:
        case_sensitive = True

settings = Settings()
