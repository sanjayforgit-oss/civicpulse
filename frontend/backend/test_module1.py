import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

# Generate unique email per test run
random_suffix = uuid.uuid4().hex[:6]
test_email_1 = f"citizen1_{random_suffix}@example.com"
test_email_2 = f"citizen2_{random_suffix}@example.com"
test_email_bad_otp = f"bad_otp_{random_suffix}@example.com"
test_email_rate_limit = f"rate_limit_{random_suffix}@example.com"

def test_1_new_email_unused_identity():
    """Test 1: New email + unused demo identity -> success"""
    # 1. Request OTP
    res_otp = requests.post(f"{BASE_URL}/auth/request-otp", json={"email": test_email_1})
    assert res_otp.status_code == 200
    otp_code = res_otp.json()["data"]["demo_otp"]

    # 2. Verify OTP
    res_verify = requests.post(f"{BASE_URL}/auth/verify-otp", json={"email": test_email_1, "otp_code": otp_code})
    assert res_verify.status_code == 200

    # 3. Check demo identity 900100001234
    res_check = requests.post(f"{BASE_URL}/auth/check-demo-identity", json={"demo_aadhaar_number": "900100001234"})
    assert res_check.status_code == 200
    assert res_check.json()["valid"] == True

    # 4. Register
    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email_1,
        "demo_aadhaar_number": "900100001234",
        "preferred_language": "Tamil",
        "password": "Password123"
    })
    assert res_reg.status_code == 200
    data = res_reg.json()
    assert "access_token" in data
    assert data["role"] == "CITIZEN"
    print("\n[PASSED] TEST 1: New email + unused demo identity registered successfully.")

def test_2_existing_email_reject():
    """Test 2: Existing email -> reject duplicate account"""
    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email_1,
        "demo_aadhaar_number": "900100001235",
        "preferred_language": "English",
        "password": "Password123"
    })
    assert res_reg.status_code == 400
    assert "already exists" in res_reg.json()["detail"]
    print("[PASSED] TEST 2: Duplicate email registration rejected correctly.")

def test_3_existing_demo_identity_reject():
    """Test 3: Existing demo identity + new email -> reject"""
    res_reg = requests.post(f"{BASE_URL}/auth/register-citizen", json={
        "email": test_email_2,
        "demo_aadhaar_number": "900100001234", # Already registered to test_email_1
        "preferred_language": "Hindi",
        "password": "Password123"
    })
    assert res_reg.status_code == 400
    assert "already been registered" in res_reg.json()["detail"]
    print("[PASSED] TEST 3: Duplicate demo identity registration rejected correctly.")

def test_4_invalid_demo_identity():
    """Test 4: Invalid demo identity -> reject"""
    res_check = requests.post(f"{BASE_URL}/auth/check-demo-identity", json={"demo_aadhaar_number": "111122223333"})
    assert res_check.status_code == 200
    assert res_check.json()["valid"] == False
    print("[PASSED] TEST 4: Non-seeded invalid demo identity rejected correctly.")

def test_5_officer_valid_credentials():
    """Test 5: Valid officer credentials -> success"""
    res_off = requests.post(f"{BASE_URL}/auth/officer-login", json={
        "officer_id": "OFF001",
        "password": "Demo@123"
    })
    assert res_off.status_code == 200
    data = res_off.json()
    assert "access_token" in data
    assert data["role"] == "OFFICER"
    print("[PASSED] TEST 5: Valid Officer (OFF001) logged in successfully.")

def test_6_officer_invalid_credentials_reject():
    """Test 6: Invalid officer password -> reject"""
    res_off = requests.post(f"{BASE_URL}/auth/officer-login", json={
        "officer_id": "OFF001",
        "password": "WrongPassword"
    })
    assert res_off.status_code == 401
    print("[PASSED] TEST 6: Invalid officer password rejected correctly (HTTP 401).")

def test_7_citizen_role_mismatch_on_officer_login():
    """Test 7: Citizen attempting to log in via Officer Login -> reject"""
    res_off = requests.post(f"{BASE_URL}/auth/officer-login", json={
        "officer_id": test_email_1,
        "password": "Password123"
    })
    assert res_off.status_code == 401
    print("[PASSED] TEST 7: Citizen attempting Officer Login rejected (HTTP 401).")

def test_8_unauthorized_access_protected_endpoint():
    """Test 8: Unauthorized access without token -> reject"""
    res_profile = requests.get(f"{BASE_URL}/users/me")
    assert res_profile.status_code in [401, 403]
    print("[PASSED] TEST 8: Protected endpoint without auth header rejected correctly.")

if __name__ == "__main__":
    print("--- RUNNING CIVICPULSE MODULE 1 AUTH & SEPARATION SUITE ---")
    test_1_new_email_unused_identity()
    test_2_existing_email_reject()
    test_3_existing_demo_identity_reject()
    test_4_invalid_demo_identity()
    test_5_officer_valid_credentials()
    test_6_officer_invalid_credentials_reject()
    test_7_citizen_role_mismatch_on_officer_login()
    test_8_unauthorized_access_protected_endpoint()
    print("\nALL 8 MODULE 1 AUTHENTICATION & SEPARATION TESTS PASSED SUCCESSFULLY!")
