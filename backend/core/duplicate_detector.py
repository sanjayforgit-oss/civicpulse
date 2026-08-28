import math
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two GPS points in meters using Haversine formula.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class DuplicateDetector:
    """
    2-Tier Duplicate Grievance Detector:
    Tier 1: Geospatial Proximity (<= 60 meters) within the same category
    Tier 2: Semantic / Keyword Overlap Similarity (>= 0.30 or high spatial proximity)
    """
    PROXIMITY_RADIUS_METERS = 60.0
    SIMILARITY_THRESHOLD = 0.30

    @classmethod
    def check_duplicate(
        cls,
        new_category: str,
        new_lat: Optional[float],
        new_lon: Optional[float],
        new_description: Optional[str],
        active_complaints: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str], float, float]:
        """
        Scans active existing complaints.
        Returns (is_duplicate, primary_complaint_id, distance_meters, text_similarity).
        """
        if not active_complaints:
            return False, None, 0.0, 0.0

        for existing in active_complaints:
            # 1. Category must match
            if existing.get("category") != new_category:
                continue

            # 2. Geospatial Proximity Check
            e_lat = existing.get("latitude")
            e_lon = existing.get("longitude")
            distance_m = 999999.0

            if (new_lat is not None and new_lon is not None and 
                e_lat is not None and e_lon is not None):
                distance_m = calculate_haversine_distance(new_lat, new_lon, e_lat, e_lon)
                
                # If too far apart geographically, not a duplicate
                if distance_m > cls.PROXIMITY_RADIUS_METERS:
                    continue

            # 3. Semantic Similarity Check
            e_desc = existing.get("translated_description") or existing.get("original_description") or ""
            n_desc = new_description or ""

            similarity = 0.0
            if n_desc.strip() and e_desc.strip():
                try:
                    words_n = set(n_desc.lower().split())
                    words_e = set(e_desc.lower().split())
                    jaccard = len(words_n.intersection(words_e)) / max(1, len(words_n.union(words_e)))

                    vectorizer = TfidfVectorizer().fit([n_desc, e_desc])
                    tfidf_matrix = vectorizer.transform([n_desc, e_desc])
                    sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
                    tfidf_sim = float(sim_matrix[0][0])
                    similarity = max(jaccard, tfidf_sim)
                except Exception:
                    similarity = 0.4 # fallback partial overlap

            # If within 60 meters and same category, high probability of duplicate
            if distance_m <= cls.PROXIMITY_RADIUS_METERS:
                if similarity >= cls.SIMILARITY_THRESHOLD or not n_desc.strip() or distance_m <= 30.0:
                    target_id = existing.get("cluster_root_id") or existing.get("id")
                    return True, target_id, round(distance_m, 1), round(similarity, 2)

        return False, None, 0.0, 0.0

duplicate_detector = DuplicateDetector()

