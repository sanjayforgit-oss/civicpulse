import re
from typing import Dict, Any

class AbuseProtectionService:
    def calculate_spam_and_abuse_score(self, text: str, user_account_age_days: int = 10) -> Dict[str, float]:
        """
        Calculates spam_score, abuse_score, device_reputation, and account_reputation.
        Flags suspicious activity rather than blindly deleting legitimate complaints.
        """
        text_content = text or ""
        spam_score = 0.0
        abuse_score = 0.0

        # Rule 1: Text repetition checks
        if len(text_content) > 0 and len(set(text_content.split())) < (len(text_content.split()) * 0.3):
            spam_score += 0.45

        # Rule 2: Suspicious spam keywords
        spam_keywords = ["buy now", "click here", "free money", "casino", "viagra", "crypto", "http://", "https://"]
        for kw in spam_keywords:
            if kw in text_content.lower():
                spam_score += 0.30

        # Rule 3: Profanity or abusive content check
        abusive_keywords = ["scam", "cheat", "idiot", "hate", "fraud"]
        for kw in abusive_keywords:
            if kw in text_content.lower():
                abuse_score += 0.25

        # Account & Device reputation scaling
        account_rep = 1.0 if user_account_age_days >= 7 else 0.8
        device_rep = 0.95

        return {
            "spam_score": min(1.0, round(spam_score, 2)),
            "abuse_score": min(1.0, round(abuse_score, 2)),
            "account_reputation": account_rep,
            "device_reputation": device_rep
        }

abuse_protection_service = AbuseProtectionService()
