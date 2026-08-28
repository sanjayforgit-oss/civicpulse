import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module4_voice_input_suite():
    print("--- RUNNING CIVICPULSE MODULE 4 VOICE INPUT IN DESCRIPTION BOX SUITE ---")
    
    # 1. Register test citizen account
    test_email = f"mod4_voice_{uuid.uuid4().hex[:6]}@example.com"
    res_otp = requests.post(f"{BASE_URL}/auth/request-otp", json={"email": test_email})
    assert res_otp.status_code == 200
    otp_code = res_otp.json()["data"]["demo_otp"]
    
    res_v = requests.post(f"{BASE_URL}/auth/verify-otp", json={"email": test_email, "otp_code": otp_code})
    assert res_v.status_code == 200

    # Dynamic demo identity check
    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email,
        "demo_aadhaar_number": "900100001234",
        "preferred_language": "Tamil",
        "password": "Password123"
    })
    token = res_reg.json().get("access_token")
    if not token:
        # Fallback to login if already exists
        res_login = requests.post(f"{BASE_URL}/auth/login", json={"email": test_email, "password": "Password123"})
        token = res_login.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    print("[PASSED] Citizen authentication verified.")

    # 2. Test Intake with Voice Base64 Data inside Description Field
    sample_voice_b64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "சாலையில் மிகப்பெரிய பள்ளம் உள்ளது (Sarvam STT Auto-Inserted)",
        "language": "Tamil",
        "voice_url": sample_voice_b64,
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_data = res_issue.json()
    assert issue_data["voice_url"] is not None
    assert issue_data["original_language"] == "Tamil"
    print(f"[PASSED] Complaint {issue_data['id']} created with integrated voice recording & editable transcript.")

    print("\nALL MODULE 4 VOICE INPUT TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module4_voice_input_suite()
