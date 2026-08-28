import os
import json
import logging
from typing import Dict, Any, Optional, List
from PIL import Image
import google.genai as genai
from google.genai import types

from backend.core.config import settings
from backend.schemas.analysis import (
    CivicCategory,
    MunicipalDepartment,
    UrgencyLevel,
    IssueCategorizationResponse
)

logger = logging.getLogger("civicpulse.categorizer")

CATEGORY_DEPARTMENT_MAP = {
    CivicCategory.ROAD_POTHOLE: (MunicipalDepartment.ROAD_MAINTENANCE_PWD, "Road Maintenance & PWD"),
    CivicCategory.OPEN_MANHOLE: (MunicipalDepartment.WATER_SUPPLY_SEWERAGE_BOARD, "Water Supply & Sewerage Board"),
    CivicCategory.BROKEN_STREETLIGHT: (MunicipalDepartment.ELECTRICITY_DISCOM, "Electricity Distribution (DISCOM)"),
    CivicCategory.GARBAGE_DUMP: (MunicipalDepartment.SOLID_WASTE_MANAGEMENT, "Solid Waste Management & Sanitation"),
    CivicCategory.DRAINAGE_WATER_LEAKAGE: (MunicipalDepartment.WATER_SUPPLY_SEWERAGE_BOARD, "Water Supply & Sewerage Board"),
    CivicCategory.FALLEN_TREE: (MunicipalDepartment.PARKS_HORTICULTURE, "Parks & Horticulture Department"),
    CivicCategory.ILLEGAL_ENCROACHMENT: (MunicipalDepartment.TOWN_PLANNING_ENCROACHMENT, "Town Planning & Anti-Encroachment"),
    CivicCategory.STRAY_ANIMAL_HAZARD: (MunicipalDepartment.PUBLIC_HEALTH_SAFETY, "Public Health & Veterinary Dept"),
    CivicCategory.PUBLIC_PROPERTY_DAMAGE: (MunicipalDepartment.GENERAL_MUNICIPAL_ADMIN, "General Municipal Administration"),
    CivicCategory.OTHER_CIVIC_ISSUE: (MunicipalDepartment.GENERAL_MUNICIPAL_ADMIN, "General Municipal Administration")
}

CATEGORY_NAMES = {
    CivicCategory.ROAD_POTHOLE: "Road Pothole & Surface Damage",
    CivicCategory.OPEN_MANHOLE: "Open Dangerous Manhole / Drain Pit",
    CivicCategory.BROKEN_STREETLIGHT: "Broken or Non-Functional Streetlight",
    CivicCategory.GARBAGE_DUMP: "Overflowing Garbage / Illegal Dumping",
    CivicCategory.DRAINAGE_WATER_LEAKAGE: "Blocked Drain / Sewage Water Leakage",
    CivicCategory.FALLEN_TREE: "Fallen Tree / Obstructing Heavy Branches",
    CivicCategory.ILLEGAL_ENCROACHMENT: "Footpath Encroachment / Illegal Structure",
    CivicCategory.STRAY_ANIMAL_HAZARD: "Aggressive Stray Animals / Cattle on Road",
    CivicCategory.PUBLIC_PROPERTY_DAMAGE: "Vandalized Public Property / Broken Railing",
    CivicCategory.OTHER_CIVIC_ISSUE: "General Civic Grievance"
}

CATEGORIZATION_PROMPT = """
You are an expert Municipal Civic Grievance Classifier for Indian Municipal Corporations.
Analyze the provided image and/or text description of the civic problem.

Return a strictly valid JSON object matching this schema:
{
  "category": "ROAD_POTHOLE" | "OPEN_MANHOLE" | "BROKEN_STREETLIGHT" | "GARBAGE_DUMP" | "DRAINAGE_WATER_LEAKAGE" | "FALLEN_TREE" | "ILLEGAL_ENCROACHMENT" | "STRAY_ANIMAL_HAZARD" | "PUBLIC_PROPERTY_DAMAGE" | "OTHER_CIVIC_ISSUE",
  "base_severity_score": <integer from 1 (minor) to 10 (life-threatening emergency)>,
  "urgency_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence_score": <float 0.0 to 1.0>,
  "detected_hazards": [<list of specific safety hazards e.g. "Risk of vehicle skidding", "Drowning hazard in monsoon", "Vector-borne disease risk">],
  "recommended_action": "<actionable directive for field engineer>",
  "ai_summary": "<concise 1-2 sentence overview of the issue>",
  "tags": [<3-5 relevant keywords>]
}

Rules:
- OPEN_MANHOLE or major deep sinkhole on fast roads = base_severity_score 8-10, Urgency CRITICAL.
- Overflowing sewage / toxic garbage near schools/homes = base_severity_score 7-8, Urgency HIGH.
- Broken streetlight on dark stretch = base_severity_score 5-6, Urgency MEDIUM.
- Minor cosmetic crack or small litter = base_severity_score 2-4, Urgency LOW.
"""

class MultimodalCategorizer:
    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client is None:
            key = settings.GEMINI_API_KEY.strip()
            if key and not key.startswith("your_"):
                try:
                    self._client = genai.Client(api_key=key)
                except Exception as e:
                    logger.error(f"Failed to initialize Gemini client: {e}")
        return self._client

    def is_configured(self) -> bool:
        return self.get_client() is not None



    async def categorize_issue(
        self,
        image_path: Optional[str] = None,
        description_text: Optional[str] = None,
        location_hint: Optional[str] = None
    ) -> IssueCategorizationResponse:
        """
        Classifies civic issue using Gemini Multimodal vision or fallback heuristic classifier.
        """
        if self.is_configured():
            try:
                contents = []
                if image_path and os.path.exists(image_path):
                    pil_img = Image.open(image_path)
                    contents.append(pil_img)
                
                context_str = f"Citizen Description: {description_text or 'No description provided.'}\n"
                if location_hint:
                    context_str += f"Location Hint: {location_hint}\n"
                contents.append(CATEGORIZATION_PROMPT + "\n\n" + context_str)

                # Call Gemini Flash
                client = self.get_client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )


                if response.text:
                    res_dict = json.loads(response.text)
                    raw_cat = res_dict.get("category", "OTHER_CIVIC_ISSUE")
                    try:
                        cat_enum = CivicCategory(raw_cat)
                    except ValueError:
                        cat_enum = CivicCategory.OTHER_CIVIC_ISSUE

                    dept_enum, dept_name = CATEGORY_DEPARTMENT_MAP.get(
                        cat_enum, (MunicipalDepartment.GENERAL_MUNICIPAL_ADMIN, "General Municipal Administration")
                    )
                    
                    urgency_raw = res_dict.get("urgency_level", "MEDIUM")
                    try:
                        urgency_enum = UrgencyLevel(urgency_raw)
                    except ValueError:
                        urgency_enum = UrgencyLevel.MEDIUM

                    return IssueCategorizationResponse(
                        category=cat_enum,
                        category_display_name=CATEGORY_NAMES.get(cat_enum, cat_enum.value),
                        department=dept_enum,
                        department_display_name=dept_name,
                        base_severity_score=max(1, min(10, int(res_dict.get("base_severity_score", 5)))),
                        urgency_level=urgency_enum,
                        confidence_score=max(0.0, min(1.0, float(res_dict.get("confidence_score", 0.9)))),
                        detected_hazards=res_dict.get("detected_hazards", []),
                        recommended_action=res_dict.get("recommended_action", "Dispatch inspection team for site assessment."),
                        ai_summary=res_dict.get("ai_summary", "Civic grievance registered."),
                        tags=res_dict.get("tags", []),
                        is_mock=False
                    )
            except Exception as e:
                logger.error(f"Gemini Categorization failed: {e}. Running fallback heuristic engine.")

        # Fallback Heuristic Classifier
        return self._heuristic_fallback(image_path, description_text)

    def _heuristic_fallback(
        self,
        image_path: Optional[str],
        description_text: Optional[str]
    ) -> IssueCategorizationResponse:
        text = (description_text or "").lower()
        fname = (os.path.basename(image_path) if image_path else "").lower()
        combined = f"{text} {fname}"

        if any(w in combined for w in ["pothole", "road", "crater", "asphalt", "गड्ढा", "சாலை"]):
            cat = CivicCategory.ROAD_POTHOLE
            severity = 7
            urgency = UrgencyLevel.HIGH
            hazards = ["Risk of two-wheeler skid and road accident", "Traffic congestion"]
            action = "Dispatch road repair asphalt mixer and road roller."
            summary = "Pothole detected on roadway posing hazard to commuters."
            tags = ["pothole", "road_damage", "pwd", "traffic_safety"]
        elif any(w in combined for w in ["manhole", "open drain", "pit", "मैनहोल"]):
            cat = CivicCategory.OPEN_MANHOLE
            severity = 9
            urgency = UrgencyLevel.CRITICAL
            hazards = ["High risk of pedestrian falling into deep drain", "Life-threatening hazard"]
            action = "Immediately barricade the manhole and install replacement RCC cover."
            summary = "Dangerous open manhole uncovered on public walkway."
            tags = ["open_manhole", "critical_hazard", "sewerage", "emergency"]
        elif any(w in combined for w in ["garbage", "trash", "waste", "dump", "कचरा", "कूड़ा", "குப்பை"]):
            cat = CivicCategory.GARBAGE_DUMP
            severity = 6
            urgency = UrgencyLevel.MEDIUM
            hazards = ["Vector-borne disease outbreak risk", "Foul odor and public health concern"]
            action = "Deploy sanitation tipper truck and compactor to clear garbage dump."
            summary = "Accumulated municipal solid waste dumping requiring clearance."
            tags = ["garbage", "sanitation", "solid_waste", "swachh"]
        elif any(w in combined for w in ["light", "dark", "lamp", "pole", "बिजली", "विளக்கு", "దీపాలు"]):
            cat = CivicCategory.BROKEN_STREETLIGHT
            severity = 5
            urgency = UrgencyLevel.MEDIUM
            hazards = ["Poor night visibility encouraging accidents and petty crime"]
            action = "Dispatch electrical lineman with boom lift to replace LED fixture."
            summary = "Non-functioning street light on residential / main lane."
            tags = ["streetlight", "electricity", "discom", "night_safety"]
        elif any(w in combined for w in ["drain", "water", "sewage", "leak", "overflow", "नाली", "சாக்கடை"]):
            cat = CivicCategory.DRAINAGE_WATER_LEAKAGE
            severity = 7
            urgency = UrgencyLevel.HIGH
            hazards = ["Waterlogging damaging road foundation", "Contamination risk"]
            action = "Deploy super-sucker jetting machine to unclog drainage pipeline."
            summary = "Sewage drainage overflow causing waterlogging and road decay."
            tags = ["drainage", "waterlogging", "sewerage", "jal_board"]
        elif any(w in combined for w in ["tree", "branch", "fallen"]):
            cat = CivicCategory.FALLEN_TREE
            severity = 6
            urgency = UrgencyLevel.MEDIUM
            hazards = ["Roadway blockage", "Power line interference risk"]
            action = "Deploy horticulture tree-cutting chainsaw unit to clear roadway."
            summary = "Fallen tree blocking vehicle and pedestrian movement."
            tags = ["fallen_tree", "horticulture", "obstruction"]
        else:
            cat = CivicCategory.OTHER_CIVIC_ISSUE
            severity = 4
            urgency = UrgencyLevel.LOW
            hazards = ["General public inconvenience"]
            action = "Assign municipal inspector to conduct on-site review."
            summary = "Civic grievance requiring municipal assessment."
            tags = ["general", "civic_issue"]

        dept, dept_name = CATEGORY_DEPARTMENT_MAP[cat]
        return IssueCategorizationResponse(
            category=cat,
            category_display_name=CATEGORY_NAMES[cat],
            department=dept,
            department_display_name=dept_name,
            base_severity_score=severity,
            urgency_level=urgency,
            confidence_score=0.85,
            detected_hazards=hazards,
            recommended_action=action,
            ai_summary=summary,
            tags=tags,
            is_mock=True
        )

categorizer_engine = MultimodalCategorizer()
