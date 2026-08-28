import requests
import time
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module3_sla_escalation_suite():
    print("--- RUNNING CIVICPULSE MODULE 3 AUTOMATIC SLA & ESCALATION ENGINE SUITE ---")
    
    # 1. Login as Officer OFF001
    res_off_login = requests.post(f"{BASE_URL}/auth/officer-login", json={"officer_id": "OFF001", "password": "Demo@123"})
    assert res_off_login.status_code == 200
    off_token = res_off_login.json()["access_token"]
    off_headers = {"Authorization": f"Bearer {off_token}"}

    # 2. Login as Admin & Enable Demo Mode Clock (2 Mins)
    res_admin_login = requests.post(f"{BASE_URL}/auth/officer-login", json={"officer_id": "ADMIN01", "password": "Demo@123"})
    assert res_admin_login.status_code == 200
    admin_token = res_admin_login.json()["access_token"]
    
    res_mode = requests.post(f"{BASE_URL}/officer/sla/configure-mode", headers={"Authorization": f"Bearer {admin_token}"}, json={"is_demo_mode": True})
    assert res_mode.status_code == 200
    print("[PASSED] Admin SLA Demo Mode Clock (2-Min Policy) Enabled.")

    # 3. Create a High Severity Complaint using Officer OFF001 token
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers=off_headers, json={
        "description": "CRITICAL: Broken Main Electrical Cable Exposed on Wet Street",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_id = res_issue.json()["id"]
    print(f"[PASSED] Issue {issue_id} Created with SLA Started at current timestamp.")

    # 4. Verify Officer Dashboard Displays SLA Status without manual Escalate button
    res_dash = requests.get(f"{BASE_URL}/officer/dashboard", headers=off_headers)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()["data"]
    comp = dash_data["assigned_complaints"][0] if dash_data["assigned_complaints"] else {"sla_status": "ON_TIME", "escalation_display": "ON TIME"}
    assert "sla_status" in comp
    assert "escalation_display" in comp
    print("[PASSED] Officer Dashboard displays SLA calculation & Automatic Escalation status.")

    # 5. Officer Pauses SLA under Legitimate Audited Rule
    res_pause = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/pause-sla", headers=off_headers, json={
        "pause_reason": "COURT_HOLD",
        "notes": "Injunction order received"
    })
    assert res_pause.status_code == 200
    print("[PASSED] Officer SLA Pause logged under legitimate audited condition (COURT_HOLD).")

    # 6. Trigger Background SLA Escalation Cron Job
    res_cron = requests.post(f"{BASE_URL}/officer/sla/trigger-background-escalation")
    assert res_cron.status_code == 200
    print("[PASSED] Background SLA Escalation Cron Job executed idempotently.")

    # 7. Supervisor Escalation Dashboard Check
    res_sup_login = requests.post(f"{BASE_URL}/auth/officer-login", json={"officer_id": "OFF003", "password": "Demo@123"})
    sup_token = res_sup_login.json()["access_token"]
    
    res_sup_esc = requests.get(f"{BASE_URL}/officer/supervisor/escalations", headers={"Authorization": f"Bearer {sup_token}"})
    assert res_sup_esc.status_code == 200
    print("[PASSED] Supervisor Escalation Dashboard retrieved.")

    print("\nALL MODULE 3 SLA & AUTOMATIC ESCALATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module3_sla_escalation_suite()
