from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicShield AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./civicshield.db", env="DATABASE_URL")
    
    # Security
    SECRET_KEY: str = Field(
        default="civicshield-dev-insecure-secret-key-change-in-production-1234567890",
        env="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]
    
    # File Storage
    UPLOAD_DIRECTORY: str = Field(default="./uploads", env="UPLOAD_DIRECTORY")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, env="MAX_UPLOAD_SIZE")  # 10 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Vision Model (RoadWatch AI)
    VISION_MODEL_PATH: Optional[str] = Field(default=None, env="VISION_MODEL_PATH")
    VISION_MODEL_NAME: str = Field(default="roadwatch-cv-v1", env="VISION_MODEL_NAME")
    
    # Optional Cloud LLM Provider
    LLM_PROVIDER: str = Field(default="none", env="LLM_PROVIDER")  # "none", "gemini"
    LLM_API_KEY: Optional[str] = Field(default=None, env="LLM_API_KEY")
    LLM_MODEL: str = Field(default="gemini-2.5-flash", env="LLM_MODEL")
    
    # External Alert Provider
    EXTERNAL_ALERT_PROVIDER: str = Field(default="simulated", env="EXTERNAL_ALERT_PROVIDER")
    EXTERNAL_ALERT_API_KEY: Optional[str] = Field(default=None, env="EXTERNAL_ALERT_API_KEY")
    
    # Demo & Audit
    DEMO_MODE_DEFAULT: bool = Field(default=True, env="DEMO_MODE_DEFAULT")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
