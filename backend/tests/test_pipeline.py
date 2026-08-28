import os
import io
import pytest
import numpy as np
from PIL import Image, PngImagePlugin
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.privacy import extract_exif_metadata, apply_pii_redaction
from backend.core.authenticity import ImageAuthenticityDetector

client = TestClient(app)

@pytest.fixture
def sample_natural_image_path(tmp_path):
    """Creates a sample natural-looking camera image with varying gradients."""
    img_path = tmp_path / "natural_photo.jpg"
    # Create natural gradient noise
    arr = np.random.randint(50, 200, (400, 400, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    img.save(str(img_path), "JPEG", quality=95)
    return str(img_path)

@pytest.fixture
def sample_ai_watermarked_image_path(tmp_path):
    """Creates a PNG image with embedded AI generator signature metadata."""
    img_path = tmp_path / "midjourney_gen.png"
    arr = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    
    png_info = PngImagePlugin.PngInfo()
    png_info.add_text("parameters", "pothole on asphalt street, photorealistic --v 6.0 (Midjourney)")
    img.save(str(img_path), "PNG", pnginfo=png_info)
    return str(img_path)

@pytest.fixture
def sample_periodic_grid_image_path(tmp_path):
    """Creates a synthetic image with strong periodic high-frequency checkerboard grid."""
    img_path = tmp_path / "spectral_grid_gen.png"
    # 8x8 checkerboard pattern repeated
    tile = np.array([[255, 0], [0, 255]], dtype=np.uint8)
    pattern = np.kron(tile, np.ones((8, 8), dtype=np.uint8))
    grid = np.tile(pattern, (32, 32))
    img = Image.fromarray(grid)
    img.save(str(img_path), "PNG")
    return str(img_path)

def test_system_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_exif_extraction_and_sanitization(sample_natural_image_path, tmp_path):
    meta = extract_exif_metadata(sample_natural_image_path)
    assert isinstance(meta, dict)
    assert "has_exif" in meta
    
    sanitized_out = str(tmp_path / "sanitized.jpg")
    redaction = apply_pii_redaction(sample_natural_image_path, sanitized_out)
    assert os.path.exists(sanitized_out)
    assert "faces_blurred" in redaction

def test_ai_authenticity_natural_image(sample_natural_image_path):
    t1 = ImageAuthenticityDetector.check_metadata_provenance(sample_natural_image_path)
    assert t1["tier1_flagged"] is False
    
    t2 = ImageAuthenticityDetector.check_spectral_fft_anomalies(sample_natural_image_path)
    assert isinstance(t2["high_freq_peak_ratio"], float)

def test_ai_authenticity_detects_metadata_provenance(sample_ai_watermarked_image_path):
    t1 = ImageAuthenticityDetector.check_metadata_provenance(sample_ai_watermarked_image_path)
    assert t1["tier1_flagged"] is True
    assert any("midjourney" in sig.lower() for sig in t1["detected_signatures"])

def test_ai_authenticity_detects_spectral_anomaly(sample_periodic_grid_image_path):
    t2 = ImageAuthenticityDetector.check_spectral_fft_anomalies(sample_periodic_grid_image_path)
    assert t2["tier2_flagged"] is True
    assert t2["spectral_score"] >= 0.70

def test_media_upload_endpoint(sample_natural_image_path):
    with open(sample_natural_image_path, "rb") as f:
        response = client.post(
            "/api/v1/media/upload",
            files={"file": ("pothole.jpg", f, "image/jpeg")},
            data={"client_latitude": "13.0827", "client_longitude": "80.2707"}
        )
    assert response.status_code == 201
    data = response.json()
    assert "media_id" in data
    assert data["media_type"] == "image"
    assert data["geolocation"]["latitude"] == 13.0827
    assert data["geolocation"]["has_gps"] is True
    assert data["sanitized_url"] is not None

def test_image_validation_endpoint(sample_ai_watermarked_image_path):
    with open(sample_ai_watermarked_image_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/media/upload",
            files={"file": ("ai_test.png", f, "image/png")}
        )
    media_id = upload_res.json()["media_id"]
    
    val_res = client.post(
        "/api/v1/ai/validate-image",
        json={"media_id": media_id}
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["status"] == "REJECTED_AI_GENERATED"
    assert val_data["is_authentic"] is False
    assert val_data["ai_generated_probability"] > 0.80
