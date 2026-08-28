import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module6_my_civic_hub_suite():
    print("--- RUNNING CIVICPULSE MODULE 6 MY CIVIC HUB SUITE ---")

    # 1. Register test citizen
    test_email = f"mod6_citizen_{uuid.uuid4().hex[:6]}@example.com"
    res_otp = requests.post(f"{BASE_URL}/auth/request-otp", json={"email": test_email})
    assert res_otp.status_code == 200
    otp_code = res_otp.json()["data"]["demo_otp"]

    res_v = requests.post(f"{BASE_URL}/auth/verify-otp", json={"email": test_email, "otp_code": otp_code})
    assert res_v.status_code == 200

    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email,
        "demo_aadhaar_number": "900100001235",
        "preferred_language": "English",
        "password": "Password123"
    })
    token = res_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Issue for Citizen
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Clogged storm drain near Anna Nagar Tower",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_id = res_issue.json()["id"]
    print(f"[PASSED] Issue {issue_id} created for Citizen My Civic Hub test.")

    # 3. Test Citizen Resolution Confirmation (YES, CONFIRM)
    res_yes = requests.post(f"{BASE_URL}/issues/{issue_id}/verify-resolution", headers=headers, json={
        "confirmed": True
    })
    assert res_yes.status_code == 200
    print("[PASSED] Citizen YES, CONFIRM resolution verified.")

    # 4. Test Citizen Reopen Request (NO, REOPEN with Mandatory Reason)
    res_no = requests.post(f"{BASE_URL}/issues/{issue_id}/verify-resolution", headers=headers, json={
        "confirmed": False,
        "note": "Drain is still overflowing after rain."
    })
    assert res_no.status_code == 200
    print("[PASSED] Citizen NO, REOPEN complaint verified with mandatory reason.")

    print("\nALL MODULE 6 MY CIVIC HUB TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module6_my_civic_hub_suite()
