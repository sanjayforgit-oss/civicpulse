import pytest
import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module9_resolution_verification_suite():
    print("--- RUNNING CIVICPULSE MODULE 9 RESOLUTION VERIFICATION & REOPEN AUTOMATED TEST SUITE ---")

    # 1. Register test citizen
    test_email = f"mod9_citizen_{uuid.uuid4().hex[:6]}@example.com"
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
    print("[PASSED] Citizen Auth Token Created for Module 9 Testing.")

    # 2. Create Issue
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Deep dangerous pothole on main road.",
        "media_url": "data:image/jpeg;base64,sample_before_pothole_photo_123",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_data = res_issue.json()
    issue_id = issue_data["id"]

    # 3. Test Confirm Resolution Workflow -> CONFIRMED & CLOSED
    res_confirm = requests.post(f"{BASE_URL}/issues/{issue_id}/confirm-resolution", headers=headers)
    assert res_confirm.status_code == 200
    confirmed_data = res_confirm.json()
    assert confirmed_data["citizen_confirmation_status"] == "CONFIRMED"
    assert confirmed_data["status"] == "CLOSED"
    print("[PASSED] Test 1: Confirm Resolution set citizen_confirmation_status = CONFIRMED and moved status to CLOSED.")

    # 4. Create Second Issue for Reopen Testing
    res_issue2 = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Water leak pipe burst.",
        "media_url": "data:image/jpeg;base64,before_pipe_leak_123",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    issue_id2 = res_issue2.json()["id"]

    # 5. Test Empty Reopen Reason Validation Error (Pydantic / FastAPI 422 Unprocessable Entity)
    res_bad_reopen = requests.post(f"{BASE_URL}/issues/{issue_id2}/reopen", headers=headers, json={
        "reason": "",
        "proof_photo": "data:image/jpeg;base64,valid_photo_123"
    })
    assert res_bad_reopen.status_code in [400, 422]
    print("[PASSED] Test 2: Reopen Request with empty reason correctly rejected with validation error.")

    # 6. Test Successful Reopen Workflow with AI Verification Engine
    res_reopen = requests.post(f"{BASE_URL}/issues/{issue_id2}/reopen", headers=headers, json={
        "reason": "The pothole remains still broken and dangerous for bikes.",
        "proof_photo": "data:image/jpeg;base64,reopen_proof_photo_valid_evidence_xyz123"
    })
    assert res_reopen.status_code == 200
    reopen_data = res_reopen.json()
    assert reopen_data["citizen_confirmation_status"] == "REOPENED"
    assert reopen_data["status"] == "REOPEN_REQUESTED"
    assert reopen_data["verification_score"] >= 0.60
    assert reopen_data["verification_status"] in ["AI_VERIFIED", "REQUIRES_SUPERVISOR_REVIEW"]
    print(f"[PASSED] Test 3: Reopen Request submitted with AI Verification score ({reopen_data['verification_score']}) & status ({reopen_data['verification_status']}).")

    # 7. Test 15-Day Rule Simulation -> PUBLIC_VERIFICATION_AVAILABLE
    res_15day = requests.post(f"{BASE_URL}/issues/{issue_id2}/trigger-15day-rule", headers=headers)
    assert res_15day.status_code == 200
    day15_data = res_15day.json()
    assert day15_data["public_verification_eligible"] == True
    assert day15_data["status"] == "PUBLIC_VERIFICATION_AVAILABLE"
    print("[PASSED] Test 4: 15-Day Rule trigger transitioned issue to PUBLIC_VERIFICATION_AVAILABLE.")

    # 8. Test Public Verification Vote Guard (Proximity & Identity Check)
    res_vote = requests.post(f"{BASE_URL}/issues/{issue_id2}/public-verify", headers=headers, json={
        "vote": "CONFIRM",
        "latitude": 13.0827, # Nearby <2km
        "longitude": 80.2707
    })
    assert res_vote.status_code == 200
    print("[PASSED] Test 5: Verified nearby citizen public verification vote recorded successfully.")

    print("\nALL MODULE 9 RESOLUTION VERIFICATION & REOPEN TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module9_resolution_verification_suite()
