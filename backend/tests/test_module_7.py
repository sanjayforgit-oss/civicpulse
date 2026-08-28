import pytest
import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas.analysis import DisputeActionEnum, DisputeDecisionEnum

client = TestClient(app)

def create_dummy_image(filename="proof.jpg"):
    arr = np.random.randint(50, 200, (300, 300, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return (filename, buf.read(), "image/jpeg")

def test_officer_resolve_and_citizen_confirm():
    # 1. Create a complaint
    sub_res = client.post(
        "/api/v1/complaints/submit",
        json={
            "citizen_user_id": "user_resolve_test",
            "text_description": "Broken drainage pipe on 4th cross road",
            "latitude": 12.9352,
            "longitude": 77.6245
        }
    )
    assert sub_res.status_code == 200
    cid = sub_res.json()["complaint"]["id"]

    # 2. Officer resolves complaint with proof notes
    resolve_res = client.post(
        f"/api/v1/complaints/{cid}/resolve",
        params={
            "assigned_worker_name": "Karthik (Drainage Inspector)",
            "resolution_notes": "Pipe replaced with new 12-inch PVC connection."
        }
    )
    assert resolve_res.status_code == 200
    resolved_comp = resolve_res.json()
    assert resolved_comp["status"] == "RESOLVED"
    assert resolved_comp["assigned_worker_name"] == "Karthik (Drainage Inspector)"

    # 3. Citizen verifies and approves
    verify_res = client.post(
        f"/api/v1/complaints/{cid}/verify-resolution",
        json={
            "action": DisputeActionEnum.APPROVE_RESOLUTION.value,
            "citizen_user_id": "user_resolve_test",
            "feedback_notes": "Great job, issue fixed!"
        }
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["decision"] == DisputeDecisionEnum.RESOLUTION_CONFIRMED.value
    assert v_data["new_status"] == "RESOLVED"

def test_citizen_reopen_dispute_and_escalation():
    # 1. Create complaint
    sub_res = client.post(
        "/api/v1/complaints/submit",
        json={
            "citizen_user_id": "citizen_dispute_user",
            "text_description": "Deep open trench left on footpath",
            "latitude": 12.9550,
            "longitude": 77.6980,
            "is_vulnerable_zone": True
        }
    )
    assert sub_res.status_code == 200
    cid = sub_res.json()["complaint"]["id"]
    initial_priority = sub_res.json()["complaint"]["priority_score"]

    # 2. Officer resolves ticket
    client.post(f"/api/v1/complaints/{cid}/resolve")

    # 3. Upload citizen rejection photo evidence
    img_tuple = create_dummy_image("trench_still_open.jpg")
    up_img_res = client.post("/api/v1/media/upload", files={"file": img_tuple})
    assert up_img_res.status_code == 201
    rej_media_id = up_img_res.json()["media_id"]

    # 4. Citizen rejects resolution within 10 meters
    dispute_res = client.post(
        f"/api/v1/complaints/{cid}/verify-resolution",
        json={
            "action": DisputeActionEnum.REJECT_REOPEN.value,
            "citizen_user_id": "citizen_dispute_user",
            "feedback_notes": "Trench is still wide open, nobody worked here.",
            "rejection_image_media_id": rej_media_id,
            "rejection_latitude": 12.95505,
            "rejection_longitude": 77.69805
        }
    )
    assert dispute_res.status_code == 200
    d_data = dispute_res.json()
    assert d_data["decision"] == DisputeDecisionEnum.REOPEN_APPROVED.value
    assert d_data["new_status"] == "REOPENED_ESCALATED"
    assert d_data["escalated_to_supervisor"] is True
    assert d_data["reopen_count"] == 1
    assert d_data["new_priority_score"] > initial_priority

def test_citizen_reopen_out_of_range_rejected():
    # 1. Create and resolve complaint
    sub_res = client.post(
        "/api/v1/complaints/submit",
        json={
            "citizen_user_id": "citizen_geo_check",
            "text_description": "Streetlight broken at 1st Main",
            "latitude": 12.9000,
            "longitude": 77.6000
        }
    )
    cid = sub_res.json()["complaint"]["id"]
    client.post(f"/api/v1/complaints/{cid}/resolve")

    # 2. Rejection photo taken 500 meters away
    dispute_res = client.post(
        f"/api/v1/complaints/{cid}/verify-resolution",
        json={
            "action": DisputeActionEnum.REJECT_REOPEN.value,
            "citizen_user_id": "citizen_geo_check",
            "rejection_latitude": 12.9050,  # ~550m away
            "rejection_longitude": 77.6050
        }
    )
    assert dispute_res.status_code == 200
    d_data = dispute_res.json()
    assert d_data["decision"] == DisputeDecisionEnum.REOPEN_REJECTED_OUT_OF_RANGE.value
    assert d_data["escalated_to_supervisor"] is False
