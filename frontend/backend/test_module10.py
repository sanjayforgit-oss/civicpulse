import pytest
import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module10_security_and_abuse_protection_suite():
    print("--- RUNNING CIVICPULSE MODULE 10 SECURITY & ABUSE PROTECTION AUTOMATED TEST SUITE ---")

    # 1. Register test citizen
    test_email = f"mod10_citizen_{uuid.uuid4().hex[:6]}@example.com"
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
    print("[PASSED] Citizen Auth Token Created for Module 10 Testing.")

    # 2. Test Rate Limiting (OTP Request Spam -> HTTP 429)
    spam_email = f"rate_limit_{uuid.uuid4().hex[:4]}@example.com"
    got_429 = False
    for _ in range(6):
        res_limit = requests.post(f"{BASE_URL}/auth/request-otp", json={"email": spam_email})
        if res_limit.status_code == 429:
            got_429 = True
            break

    assert got_429 == True
    print("[PASSED] Test 1: Rate Limiting Middleware correctly returned HTTP 429 Too Many Requests on OTP spam.")

    # 3. Test Security HTTP Response Headers
    res_root = requests.get("http://localhost:8000/")
    assert res_root.status_code == 200
    assert "X-Content-Type-Options" in res_root.headers
    assert res_root.headers["X-Content-Type-Options"] == "nosniff"
    assert "X-Frame-Options" in res_root.headers
    assert res_root.headers["X-Frame-Options"] == "DENY"
    print("[PASSED] Test 2: Secure HTTP Headers (X-Content-Type-Options, X-Frame-Options) verified.")

    # 4. Create Issue & Test Public Support Duplicate Voting Guard
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": "Streetlight broken pole lamp not working.",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_id = res_issue.json()["id"]

    # First support vote -> 200 OK
    res_sup1 = requests.post(f"{BASE_URL}/issues/{issue_id}/support", headers=headers)
    assert res_sup1.status_code == 200
    
    # Second duplicate support vote -> 400 Bad Request
    res_sup2 = requests.post(f"{BASE_URL}/issues/{issue_id}/support", headers=headers)
    assert res_sup2.status_code == 400
    print("[PASSED] Test 3: Public Support Abuse Guard prevented duplicate voting from single account.")

    # 5. Test Anti-Spam Scoring Engine (Repetitive text flags SPAM_SUSPECTED or high spam score)
    spam_text = "buy buy buy buy buy buy buy buy buy buy buy buy buy buy buy"
    res_spam_issue = requests.post(f"{BASE_URL}/issues/create", headers=headers, json={
        "description": spam_text,
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_spam_issue.status_code == 200
    spam_data = res_spam_issue.json()
    assert spam_data["spam_score"] >= 0.30
    assert spam_data["ai_review_status"] in ["SPAM_SUSPECTED", "AUTO_APPROVED", "AI_REVIEW_REQUIRED"]
    print(f"[PASSED] Test 4: Anti-Spam Engine calculated spam score ({spam_data['spam_score']}) & status ({spam_data['ai_review_status']}).")

    # 6. Test Privacy Guarantee (Zero Aadhaar leaks in Public APIs)
    res_pub = requests.get(f"{BASE_URL}/citizen/public-issues", headers=headers)
    assert res_pub.status_code == 200
    for pub in res_pub.json():
        assert "demo_aadhaar_number" not in pub
        assert "identity_reference" not in pub
        assert "password_hash" not in pub
    print("[PASSED] Test 5: Privacy Isolation Check verified zero Aadhaar or identity leaks in public feeds.")

    print("\nALL MODULE 10 SECURITY & ABUSE PROTECTION TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module10_security_and_abuse_protection_suite()
