import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_module5_map_heatmap_suite():
    print("--- RUNNING CIVICPULSE MODULE 5 MAP & HEATMAP REDESIGN SUITE ---")

    # 1. Test Server-Side Heatmap Clusters Aggregation Endpoint (Anonymized PII Protection)
    res_heat = requests.get(f"{BASE_URL}/issues/heatmap-clusters?category=ROADS&status_filter=OPEN")
    assert res_heat.status_code == 200
    clusters = res_heat.json()
    assert isinstance(clusters, list)
    print("[PASSED] Server-side heatmap aggregation query executed cleanly.")

    # 2. Verify PII Protection in Heatmap Payload (No reporter_id, email, or exact PII exposed)
    if clusters:
        point = clusters[0]
        assert "reporter_id" not in point
        assert "email" not in point
        assert "lat" in point
        assert "lon" in point
        assert "intensity" in point
        assert "category" in point
        print("[PASSED] Privacy Enforcement: Heatmap payload excludes all citizen PII.")

    # 3. Test Viewport Public Nearby Endpoint with Category Filter
    res_nearby = requests.get(f"{BASE_URL}/issues/public-nearby?lat=13.0827&lon=80.2707&radius_km=10.0&category=ROADS")
    assert res_nearby.status_code == 200
    print("[PASSED] Viewport public nearby complaints retrieved.")

    print("\nALL MODULE 5 CIVIC MAP & HEATMAP TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_module5_map_heatmap_suite()
