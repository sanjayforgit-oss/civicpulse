import pytest
import datetime
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import init_db
from backend.core.priority import calculate_dynamic_priority
from backend.core.duplicate_detector import calculate_haversine_distance, duplicate_detector

# Ensure database tables are created for tests
asyncio.run(init_db())

client = TestClient(app)


def test_haversine_distance_calculation():
    # MG Road Bengaluru points ~ 35 meters apart
    lat1, lon1 = 12.971598, 77.594562
    lat2, lon2 = 12.971850, 77.594750
    dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    assert 20.0 <= dist <= 50.0

def test_dynamic_priority_calculation():
    # Base calculation
    calc = calculate_dynamic_priority(
        base_severity=8,
        upvotes=5,
        duplicate_count=3,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=24),
        is_vulnerable_zone=True,
        urgency_level="CRITICAL"
    )
    assert calc["priority_score"] >= 75.0
    assert calc["escalation_tier"] in ["HIGH_PRIORITY", "CRITICAL_ESCALATION"]
    assert calc["breakdown"]["vulnerable_zone_bonus"] == 10.0

def test_duplicate_detector_engine():
    active_complaints = [
        {
            "id": "cmp_test100",
            "category": "ROAD_POTHOLE",
            "latitude": 12.971598,
            "longitude": 77.594562,
            "translated_description": "Deep dangerous pothole on MG road near metro station",
            "cluster_root_id": None
        }
    ]

    # Duplicate complaint: same category, 25m distance, similar text
    is_dup, matched_id, dist_m, sim = duplicate_detector.check_duplicate(
        new_category="ROAD_POTHOLE",
        new_lat=12.971750,
        new_lon=77.594650,
        new_description="Large crater pothole on MG Road next to metro pillar",
        active_complaints=active_complaints
    )
    assert is_dup is True
    assert matched_id == "cmp_test100"
    assert dist_m <= 50.0

def test_submit_complaint_and_duplicate_clustering():
    # Submit first primary complaint at a fresh GPS location
    lat_base, lon_base = 12.912345, 77.654321
    res1 = client.post(
        "/api/v1/complaints/submit",
        json={
            "citizen_user_id": "citizen_alice_unique",
            "text_description": "Massive road pothole on HSR Layout Sector 1 main road",
            "latitude": lat_base,
            "longitude": lon_base,
            "location_address": "HSR Layout Sector 1",
            "is_vulnerable_zone": True
        }
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    # If not previously submitted at this coordinate, it is not duplicate
    if not data1["is_duplicate"]:
        primary_id = data1["complaint"]["id"]
        assert data1["complaint"]["is_cluster_root"] is True

        # Submit second complaint nearby (15m apart) with similar description
        res2 = client.post(
            "/api/v1/complaints/submit",
            json={
                "citizen_user_id": "citizen_bob_unique",
                "text_description": "Very big road pothole on HSR Layout Sector 1",
                "latitude": lat_base + 0.0001,
                "longitude": lon_base + 0.0001,
                "location_address": "HSR Layout Sector 1 near signal",
                "is_vulnerable_zone": True
            }
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["success"] is True
        assert data2["is_duplicate"] is True
        assert data2["matched_primary_id"] == primary_id

def test_upvote_and_priority_escalation():

    # Submit a complaint
    res = client.post(
        "/api/v1/complaints/submit",
        json={
            "citizen_user_id": "citizen_charlie",
            "text_description": "Overflowing garbage dump outside city hospital gate",
            "latitude": 13.0358,
            "longitude": 77.5970,
            "is_vulnerable_zone": True
        }
    )
    assert res.status_code == 200
    comp_id = res.json()["complaint"]["id"]
    initial_priority = res.json()["complaint"]["priority_score"]

    # Upvote
    up_res = client.post(f"/api/v1/complaints/{comp_id}/upvote?user_id=citizen_dan")
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["upvote_count"] == 2
    assert up_data["new_priority_score"] > initial_priority

def test_list_and_update_status():
    # List complaints
    list_res = client.get("/api/v1/complaints")
    assert list_res.status_code == 200
    complaints = list_res.json()
    assert len(complaints) > 0
    target_id = complaints[0]["id"]

    # Update status to IN_PROGRESS
    patch_res = client.patch(
        f"/api/v1/complaints/{target_id}/status",
        json={
            "status": "IN_PROGRESS",
            "assigned_worker_name": "Ramesh Kumar (Junior Engineer PWD)",
            "resolution_notes": "Road repair crew deployed with cold mix asphalt."
        }
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "IN_PROGRESS"
    assert updated["assigned_worker_name"] == "Ramesh Kumar (Junior Engineer PWD)"

def test_heatmap_analytics_endpoint():
    res = client.get("/api/v1/complaints/analytics/heatmap")
    assert res.status_code == 200
    data = res.json()
    assert "total_active_complaints" in data
    assert "total_clusters" in data
    assert "heatmap_points" in data
    assert "department_distribution" in data
    assert "category_distribution" in data
    if len(data["heatmap_points"]) > 0:
        pt = data["heatmap_points"][0]
        assert "latitude" in pt
        assert "longitude" in pt
        assert "weight" in pt
        assert 0.0 <= pt["weight"] <= 1.0
        assert 1 <= pt["severity"] <= 10

