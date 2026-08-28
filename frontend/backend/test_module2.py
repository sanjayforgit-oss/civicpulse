import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_module2_officer_portal_suite():
    print("--- RUNNING CIVICPULSE MODULE 2 OFFICER PORTAL & WORKFLOW SUITE ---")
    
    # 1. Login as Demo Officer OFF001
    res_off_login = requests.post(f"{BASE_URL}/auth/officer-login", json={
        "officer_id": "OFF001",
        "password": "Demo@123"
    })
    assert res_off_login.status_code == 200
    off_token = res_off_login.json()["access_token"]
    print("[PASSED] Officer OFF001 login and token generation.")

    # 2. Get Officer Dashboard & Operational Workspace Summary
    res_dash = requests.get(f"{BASE_URL}/officer/dashboard", headers={"Authorization": f"Bearer {off_token}"})
    assert res_dash.status_code == 200
    data = res_dash.json()["data"]
    assert "summary_cards" in data
    assert "assigned_complaints" in data
    print("[PASSED] Officer Dashboard metrics & assigned complaints retrieved.")

    # 3. Create a test complaint directly using Officer OFF001 authorization header
    res_issue = requests.post(f"{BASE_URL}/issues/create", headers={"Authorization": f"Bearer {off_token}"}, json={
        "description": "Deep Pothole near Anna Salai Junction",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_ward": "Ward 104, Anna Nagar"
    })
    assert res_issue.status_code == 200
    issue_id = res_issue.json()["id"]
    print(f"[PASSED] Created test complaint {issue_id} for officer workflow.")

    # 4. Officer Accepts Task
    res_accept = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/accept", headers={"Authorization": f"Bearer {off_token}"}, json={"notes": "Task accepted"})
    assert res_accept.status_code == 200
    print("[PASSED] Officer Workflow Step 1: ASSIGNED -> ACCEPTED.")

    # 5. Officer Submits Site Inspection Report
    res_insp = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/submit-inspection", headers={"Authorization": f"Bearer {off_token}"}, json={
        "latitude": 13.0827,
        "longitude": 80.2707,
        "problem_condition": "Eroded road patch",
        "severity": "HIGH",
        "recommended_action": "Resurface road patch",
        "preliminary_estimate": 25000
    })
    assert res_insp.status_code == 200
    print("[PASSED] Officer Workflow Step 2: SITE_INSPECTION report submitted.")

    # 6. Officer Requests Budget Approval
    res_bud = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/request-budget", headers={"Authorization": f"Bearer {off_token}"}, json={
        "estimated_cost": 25000,
        "reason": "Cold-mix asphalt hire required"
    })
    assert res_bud.status_code == 200
    print("[PASSED] Officer Workflow Step 3: BUDGET_CHECK request submitted.")

    # 7. Role Security Block Test (Officer OFF001 with role 'OFFICER' cannot approve budget)
    res_self = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/decide-budget", headers={"Authorization": f"Bearer {off_token}"}, json={
        "approved": True
    })
    assert res_self.status_code == 403
    print("[PASSED] Security Enforcement: Officer cannot self-approve budget (HTTP 403 Forbidden).")

    # 8. Supervisor Decides Budget (OFF003 Supervisor)
    res_sup_login = requests.post(f"{BASE_URL}/auth/officer-login", json={"officer_id": "OFF003", "password": "Demo@123"})
    sup_token = res_sup_login.json()["access_token"]
    
    res_dec = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/decide-budget", headers={"Authorization": f"Bearer {sup_token}"}, json={
        "approved": True,
        "notes": "Approved by Zonal Supervisor"
    })
    assert res_dec.status_code == 200
    print("[PASSED] Officer Workflow Step 4: Budget APPROVED by Zonal Supervisor.")

    # 9. Create Work Order
    res_wo = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/create-work-order", headers={"Authorization": f"Bearer {off_token}"}, json={
        "work_description": "Resurface road patch",
        "estimated_cost": 25000,
        "assigned_team": "internal_field_team"
    })
    assert res_wo.status_code == 200
    print("[PASSED] Officer Workflow Step 5: WORK_ORDER_CREATED.")

    # 10. Update Work Progress
    res_prog = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/update-progress", headers={"Authorization": f"Bearer {off_token}"}, json={
        "status": "IN_PROGRESS",
        "notes": "Field team actively compacting asphalt"
    })
    assert res_prog.status_code == 200
    print("[PASSED] Officer Workflow Step 6: Status updated to IN_PROGRESS.")

    # 11. Upload Resolution Evidence
    res_ev = requests.post(f"{BASE_URL}/officer/issues/{issue_id}/submit-evidence", headers={"Authorization": f"Bearer {off_token}"}, json={
        "after_photo_url": "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=600&q=80",
        "completion_notes": "Road repair complete",
        "completion_latitude": 13.0827,
        "completion_longitude": 80.2707
    })
    assert res_ev.status_code == 200
    print("[PASSED] Officer Workflow Step 7: EVIDENCE_UPLOADED -> WAITING_FOR_CITIZEN_VERIFICATION.")

    print("\nALL 11 MODULE 2 OFFICER WORKFLOW TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module2_officer_portal_suite()
