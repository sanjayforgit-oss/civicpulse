import pytest
import requests
import uuid
import time
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000/api/v1"

def test_module7_deduplication_suite():
    print("--- RUNNING CIVICPULSE MODULE 7 DUPLICATE COMPLAINT DETECTION SUITE ---")

    # 1. Register test citizen
    test_email = f"mod7_citizen_{uuid.uuid4().hex[:6]}@example.com"
    res_otp = requests.post(f"{BASE_URL}/auth/request-otp", json={"email": test_email})
    assert res_otp.status_code == 200
    otp_code = res_otp.json()["data"]["demo_otp"]

    res_v = requests.post(f"{BASE_URL}/auth/verify-otp", json={"email": test_email, "otp_code": otp_code})
    assert res_v.status_code == 200

    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email,
        "demo_aadhaar_number": "900100001237",
        "preferred_language": "English",
        "password": "Password123"
    })
    assert res_reg.status_code == 200
    token = res_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASSED] Citizen Auth Token Created for Module 7 Testing.")

    # 2. Master Issue Submission: Pothole at GPS (13.0827, 80.2707)
    sample_img = "data:image/jpeg;base64,pothole_master_sample_img_123"
    res_master = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Dangerous deep pothole near Anna Nagar bus stand.",
        "media_url": sample_img,
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_master.status_code == 200
    master_data = res_master.json()
    master_id = master_data["id"]
    assert master_data["is_duplicate"] == False
    assert master_data["reports_count"] == 1
    print(f"[PASSED] Master Issue Created: {master_id}.")

    # 3. Test 1: Same Image + Nearby GPS (10 meters away) -> High Duplicate Score
    res_dup1 = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Dangerous deep pothole near Anna Nagar bus stand.",
        "media_url": sample_img,
        "latitude": 13.08278, # ~9 meters away
        "longitude": 80.27072,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_dup1.status_code == 200
    dup1_data = res_dup1.json()
    assert dup1_data["is_duplicate"] == True
    assert dup1_data["duplicate_of_id"] == master_id
    assert dup1_data["duplicate_score"] >= 0.65
    print("[PASSED] Test 1: Same Image + Nearby GPS evaluated as DUPLICATE and merged under Master Issue.")

    # 4. Test 2: Different Image + Nearby GPS -> Lower similarity, NOT merged automatically
    diff_img = "data:image/jpeg;base64,completely_different_image_xyz_999999999999999"
    res_diff = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Completely different issue description about street decoration.",
        "media_url": diff_img,
        "latitude": 13.08275, # Close GPS
        "longitude": 80.27071
    })
    assert res_diff.status_code == 200
    diff_data = res_diff.json()
    assert diff_data["is_duplicate"] == False # Must not merge solely on GPS!
    print("[PASSED] Test 2: Different Image + Nearby GPS preserved as NEW separate issue.")

    # 5. Test 3: Same Text + Nearby GPS -> High duplicate match
    res_dup3 = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Dangerous deep pothole near Anna Nagar bus stand.",
        "latitude": 13.08272,
        "longitude": 80.27071
    })
    assert res_dup3.status_code == 200
    dup3_data = res_dup3.json()
    assert dup3_data["is_duplicate"] == True
    assert dup3_data["duplicate_of_id"] == master_id
    print("[PASSED] Test 3: Same Text + Nearby GPS merged as DUPLICATE.")

    # 6. Test 4: Same Street but Different Problem Category (Pothole vs Streetlight)
    res_light = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Broken streetlight dark pole lamp not working.",
        "latitude": 13.0827,
        "longitude": 80.2707
    })
    assert res_light.status_code == 200
    light_data = res_light.json()
    assert light_data["ai_category"] == "STREETLIGHT"
    assert light_data["is_duplicate"] == False # Different category defect on same street!
    print("[PASSED] Test 4: Same Street but Different Problem (Streetlight vs Pothole) preserved as NEW issue.")

    # 7. Test Get Linked Duplicates Endpoint
    res_children = requests.get(f"{BASE_URL}/issues/{master_id}/duplicates", headers=headers)
    assert res_children.status_code == 200
    children = res_children.json()
    assert len(children) >= 2
    print(f"[PASSED] GET /issues/{master_id}/duplicates returned {len(children)} child duplicate reports.")

    print("\nALL MODULE 7 DUPLICATE COMPLAINT DETECTION TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module7_deduplication_suite()
