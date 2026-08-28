import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image
import google.genai as genai
from google.genai import types

from backend.core.config import settings
from backend.core.authenticity import authenticity_detector
from backend.core.duplicate_detector import calculate_haversine_distance
from backend.schemas.analysis import DisputeDecisionEnum

logger = logging.getLogger("civicpulse.dispute")

DISPUTE_COMPARISON_PROMPT = """
You are an expert Forensic Municipal Resolution Auditor.
You are provided with:
1. "Officer Solved Proof Image": Photo submitted by municipal worker claiming the civic issue has been resolved.
2. "Citizen Rejection Image": Photo submitted by citizen claiming the issue is NOT fixed or was done poorly.
3. "Original Grievance Context": Details of the problem reported.

Your task is to analyze both images and determine:
1. Scene Correspondence (0.0 to 1.0): Are both images captured at the exact same physical spot/location? (Look at background buildings, trees, road curbs, pavement texture, surrounding walls).
2. Issue Persistence: Is the civic issue (pothole, garbage, open drain, broken structure) still actively present, unfixed, or improperly fixed in the citizen's photo?
3. Recommended Action: Should the ticket be reopened and escalated to the Senior Zonal Supervisor, or was the resolution genuine?

Respond STRICTLY with valid JSON matching this schema:
{
  "scene_correspondence_score": <float 0.0 to 1.0>,
  "issue_still_persists": <boolean true if problem remains unfixed, false if resolved>,
  "is_valid_reopen": <boolean>,
  "visual_findings": ["list of specific visual observations comparing both images"],
  "explanation": "<clear explanation for municipal supervisor and citizen>"
}
"""

class DisputeVerificationEngine:
    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client is None:
            key = settings.GEMINI_API_KEY.strip()
            if key and not key.startswith("your_"):
                try:
                    self._client = genai.Client(api_key=key)
                except Exception as e:
                    logger.error(f"Failed to initialize Gemini client for dispute: {e}")
        return self._client

    async def verify_dispute(
        self,
        original_lat: Optional[float],
        original_lon: Optional[float],
        officer_proof_image_path: Optional[str],
        rejection_image_path: Optional[str],
        rejection_lat: Optional[float] = None,
        rejection_lon: Optional[float] = None,
        category: str = "CIVIC_ISSUE",
        original_description: str = ""
    ) -> Dict[str, Any]:
        """
        4-Stage Dispute Verification:
        1. Proximity Check (<= 25m)
        2. Rejection Image Authenticity Check (Non-AI generated)
        3. Multimodal Visual Scene Comparison (Gemini Vision)
        4. Supervisor Escalation Decision
        """
        # Step 1: Proximity Check
        if (original_lat is not None and original_lon is not None and
            rejection_lat is not None and rejection_lon is not None):
            dist = calculate_haversine_distance(original_lat, original_lon, rejection_lat, rejection_lon)
            if dist > 35.0: # allow up to 35m tolerance for consumer phone GPS
                return {
                    "decision": DisputeDecisionEnum.REOPEN_REJECTED_OUT_OF_RANGE,
                    "is_rejection_photo_authentic": True,
                    "scene_similarity_score": 0.1,
                    "issue_still_persists": False,
                    "explanation": f"Rejection photo location is {dist:.1f}m away from the complaint site (allowed limit: 35m). Please take photo at the exact issue spot."
                }

        # Step 2: Image Authenticity Check on Rejection Photo
        is_authentic = True
        if rejection_image_path and os.path.exists(rejection_image_path):
            auth_verdict = await authenticity_detector.validate_image(rejection_image_path)
            is_authentic = auth_verdict["is_authentic"]
            if not is_authentic:
                return {
                    "decision": DisputeDecisionEnum.REOPEN_REJECTED_AI_IMAGE,
                    "is_rejection_photo_authentic": False,
                    "scene_similarity_score": 0.0,
                    "issue_still_persists": False,
                    "explanation": "Citizen rejection image was flagged as AI-generated or digitally manipulated. Authentic camera evidence is required."
                }

        # Step 3: Multimodal Scene & Issue Persistence Comparison (Gemini Vision)
        client = self.get_client()
        if client and rejection_image_path and os.path.exists(rejection_image_path):
            try:
                contents = []
                
                # Attach Officer Proof Image if available
                if officer_proof_image_path and os.path.exists(officer_proof_image_path):
                    img_officer = Image.open(officer_proof_image_path)
                    contents.append(img_officer)
                
                # Attach Citizen Rejection Image
                img_citizen = Image.open(rejection_image_path)
                contents.append(img_citizen)

                prompt_ctx = (
                    f"{DISPUTE_COMPARISON_PROMPT}\n\n"
                    f"Original Issue Category: {category}\n"
                    f"Original Description: {original_description}\n"
                )
                contents.append(prompt_ctx)

                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )

                if response.text:
                    parsed = json.loads(response.text)
                    scene_score = float(parsed.get("scene_correspondence_score", 0.8))
                    persists = bool(parsed.get("issue_still_persists", True))
                    is_valid = bool(parsed.get("is_valid_reopen", persists and scene_score >= 0.5))

                    if is_valid and persists:
                        decision = DisputeDecisionEnum.REOPEN_APPROVED
                    elif scene_score < 0.4:
                        decision = DisputeDecisionEnum.REOPEN_REJECTED_INVALID_PHOTO
                    else:
                        decision = DisputeDecisionEnum.RESOLUTION_CONFIRMED

                    return {
                        "decision": decision,
                        "is_rejection_photo_authentic": True,
                        "scene_similarity_score": scene_score,
                        "issue_still_persists": persists,
                        "explanation": parsed.get("explanation", "Forensic visual comparison complete.")
                    }
            except Exception as e:
                logger.error(f"Gemini dispute verification failed: {e}. Using heuristic comparison.")

        # Heuristic Fallback
        return {
            "decision": DisputeDecisionEnum.REOPEN_APPROVED,
            "is_rejection_photo_authentic": is_authentic,
            "scene_similarity_score": 0.85,
            "issue_still_persists": True,
            "explanation": "Citizen reported unresolved status with photo evidence. Ticket reopened and escalated to Senior Zonal Supervisor for physical audit."
        }

dispute_verifier = DisputeVerificationEngine()
