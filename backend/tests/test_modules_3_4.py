import os
import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.main import app
from backend.core.sarvam import sarvam_engine
from backend.core.categorizer import categorizer_engine, CivicCategory, MunicipalDepartment

client = TestClient(app)

import numpy as np

def create_sample_image(filename="pothole_test.jpg"):
    arr = np.random.randint(50, 200, (400, 400, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    buf.seek(0)
    return (filename, buf.read(), "image/jpeg")


def create_sample_audio(filename="pothole_voice.wav"):
    # Minimal valid RIFF WAV header
    wav_header = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    return (filename, wav_header, "audio/wav")

def test_translation_endpoint():
    """Test translating Hindi/Tamil text to English"""
    response = client.post(
        "/api/v1/audio/translate",
        json={
            "input_text": "यहाँ सड़क पर बहुत बड़ा गड्ढा है",
            "source_language_code": "hi-IN",
            "target_language_code": "en-IN"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "translated_text" in data
    assert len(data["translated_text"]) > 0

def test_voice_transcribe_and_process_endpoint():
    """Test voice file upload and combined transcription + translation"""
    audio_tuple = create_sample_audio("pothole_complaint.wav")
    response = client.post(
        "/api/v1/audio/process-voice-complaint",
        files={"audio_file": audio_tuple}
    )
    assert response.status_code == 200
    data = response.json()
    assert "media_id" in data
    assert "original_transcript" in data
    assert "translated_english_text" in data
    assert len(data["translated_english_text"]) > 0

def test_categorize_issue_endpoint():
    """Test multimodal categorization for Pothole issue"""
    response = client.post(
        "/api/v1/ai/categorize-issue",
        json={
            "description_text": "Large deep pothole on MG Road causing traffic accidents and two-wheeler skids",
            "location_hint": "MG Road, Sector 14"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == CivicCategory.ROAD_POTHOLE.value
    assert data["department"] == MunicipalDepartment.ROAD_MAINTENANCE_PWD.value
    assert 1 <= data["base_severity_score"] <= 10
    assert data["urgency_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(data["recommended_action"]) > 0

def test_categorize_garbage_issue():
    """Test classification for Garbage Dump issue"""
    response = client.post(
        "/api/v1/ai/categorize-issue",
        json={
            "description_text": "Huge pile of overflowing trash and rotten garbage near market street",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == CivicCategory.GARBAGE_DUMP.value
    assert data["department"] == MunicipalDepartment.SOLID_WASTE_MANAGEMENT.value

def test_categorize_open_manhole_critical():
    """Test critical severity for open manhole"""
    response = client.post(
        "/api/v1/ai/categorize-issue",
        json={
            "description_text": "Dangerous open manhole on pedestrian sidewalk, someone could fall inside",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == CivicCategory.OPEN_MANHOLE.value
    assert data["urgency_level"] == "CRITICAL"
    assert data["base_severity_score"] >= 8

def test_full_complaint_pipeline():
    """Test end-to-end full complaint pipeline endpoint with image and audio"""
    img_tuple = create_sample_image("road_crater.jpg")
    aud_tuple = create_sample_audio("complaint.wav")

    response = client.post(
        "/api/v1/ai/full-complaint-pipeline",
        files={
            "image_file": img_tuple,
            "audio_file": aud_tuple
        },
        data={
            "location_hint": "Koramangala 5th Block"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "APPROVED_AND_CATEGORIZED"
    assert data["is_authentic_image"] is True
    assert "categorization" in data
    assert "category" in data["categorization"]
    assert "department" in data["categorization"]
