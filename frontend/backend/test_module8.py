import pytest
import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module8_civic_hub_suite():
    print("--- RUNNING CIVICPULSE MODULE 8 MY CIVIC HUB & HEATMAP AUTOMATED TEST SUITE ---")

    # 1. Register test citizen
    test_email = f"mod8_citizen_{uuid.uuid4().hex[:6]}@example.com"
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
    print("[PASSED] Citizen Auth Token Created for Module 8 Testing.")

    # 2. Test Privacy-Sanitized Public Feed (No email/phone exposed)
    res_pub = requests.get(f"{BASE_URL}/citizen/public-issues", headers=headers)
    assert res_pub.status_code == 200
    public_list = res_pub.json()
    assert len(public_list) > 0
    for issue in public_list:
        assert "reporter_email" not in issue
        assert "reporter_phone" not in issue
        assert "identity_reference" not in issue
    print("[PASSED] Test 1: Public Complaints Feed Privacy Check (Zero reporter identity fields exposed).")

    # 3. Test Heatmap Aggregated Clusters Endpoint
    res_heat = requests.get(f"{BASE_URL}/citizen/heatmap-clusters", headers=headers)
    assert res_heat.status_code == 200
    clusters = res_heat.json()
    assert len(clusters) > 0
    for cluster in clusters:
        assert "latitude" in cluster and "longitude" in cluster
        assert "density_score" in cluster
        assert "category" in cluster
    print(f"[PASSED] Test 2: Heatmap Aggregated Cluster Endpoint returned {len(clusters)} ward density points.")

    # 4. Test Complete 9-Step Status Timeline Endpoint
    issue_id = public_list[0]["id"]
    res_detail = requests.get(f"{BASE_URL}/citizen/issues/{issue_id}/detail", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert "timeline_steps" in detail
    steps = detail["timeline_steps"]
    assert len(steps) == 9
    assert steps[0]["step_key"] == "SUBMITTED"
    assert steps[5]["step_key"] == "ASSIGNED"
    assert steps[8]["step_key"] == "VERIFIED"
    print("[PASSED] Test 3: Complete 9-Step Status Timeline Generated Successfully.")

    print("\nALL MODULE 8 MY CIVIC HUB, PUBLIC FEED & HEATMAP TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module8_civic_hub_suite()
