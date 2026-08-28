import os
import uuid
import shutil
from typing import Tuple, Optional
from fastapi import UploadFile
from backend.core.config import settings

class MediaStorageManager:
    @staticmethod
    def generate_media_id(prefix: str = "med") -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"

    @staticmethod
    async def save_upload_file(upload_file: UploadFile, is_audio: bool = False) -> Tuple[str, str, str]:
        """
        Saves uploaded file to disk and returns (media_id, file_path, filename).
        """
        extension = os.path.splitext(upload_file.filename or "")[1].lower()
        if not extension:
            extension = ".mp3" if is_audio else ".jpg"
            
        media_id = MediaStorageManager.generate_media_id("aud" if is_audio else "img")
        filename = f"{media_id}{extension}"
        
        target_dir = settings.AUDIO_MEDIA_DIR if is_audio else settings.ORIGINAL_MEDIA_DIR
        file_path = os.path.join(target_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return media_id, file_path, filename

    @staticmethod
    def get_sanitized_path(filename: str) -> str:
        return os.path.join(settings.SANITIZED_MEDIA_DIR, filename)

    @staticmethod
    def get_original_path(filename: str) -> str:
        return os.path.join(settings.ORIGINAL_MEDIA_DIR, filename)

    @staticmethod
    def get_audio_path(filename: str) -> str:
        return os.path.join(settings.AUDIO_MEDIA_DIR, filename)

    @staticmethod
    def get_media_record(media_id: str) -> Optional[dict]:
        """Finds media file across original, sanitized, and audio storage directories."""
        for dir_path in [settings.ORIGINAL_MEDIA_DIR, settings.SANITIZED_MEDIA_DIR, settings.AUDIO_MEDIA_DIR]:
            if not os.path.exists(dir_path):
                continue
            for f in os.listdir(dir_path):
                if f.startswith(media_id):
                    full_path = os.path.join(dir_path, f)
                    sanitized = os.path.join(settings.SANITIZED_MEDIA_DIR, f)
                    return {
                        "media_id": media_id,
                        "filename": f,
                        "file_path": full_path,
                        "sanitized_path": sanitized if os.path.exists(sanitized) else None
                    }
        return None

    @classmethod
    async def save_image(cls, upload_file: UploadFile) -> dict:
        from backend.core.privacy import extract_exif_metadata, apply_pii_redaction
        media_id, orig_path, filename = await cls.save_upload_file(upload_file, is_audio=False)
        sanitized_path = cls.get_sanitized_path(filename)
        redaction_stats = apply_pii_redaction(orig_path, sanitized_path)
        exif = extract_exif_metadata(orig_path)
        return {
            "media_id": media_id,
            "filename": filename,
            "file_path": orig_path,
            "sanitized_path": sanitized_path,
            "redaction_stats": redaction_stats,
            "exif": exif
        }

    @classmethod
    async def save_audio(cls, upload_file: UploadFile) -> dict:
        media_id, audio_path, filename = await cls.save_upload_file(upload_file, is_audio=True)
        return {
            "media_id": media_id,
            "filename": filename,
            "file_path": audio_path
        }

storage_service = MediaStorageManager

