import math
import datetime
from typing import Dict, Any, Optional

def calculate_dynamic_priority(
    base_severity: int,
    upvotes: int = 1,
    duplicate_count: int = 1,
    created_at: Optional[datetime.datetime] = None,
    is_vulnerable_zone: bool = False,
    urgency_level: str = "MEDIUM"
) -> Dict[str, Any]:
    """
    Computes real-time dynamic priority score (0.0 - 100.0).

    Formula:
    Base Component = (Base Severity / 10.0) * 40.0
    Crowd Weight = min(25.0, (upvotes * 2.5) + ((duplicate_count - 1) * 5.0))
    Urgency Weight = 15.0 (CRITICAL) | 10.0 (HIGH) | 5.0 (MEDIUM) | 0.0 (LOW)
    Aging Penalty = +1.5 points per 12 hours pending (capped at 15.0)
    Vulnerable Zone Bonus = +10.0 (near hospitals, schools, high traffic)
    """
    # 1. Base Severity Component (0 - 40 points)
    sev = max(1, min(10, base_severity))
    severity_component = (sev / 10.0) * 40.0

    # 2. Crowd Consensus & Duplicate Signals (0 - 25 points)
    crowd_component = min(25.0, (upvotes * 2.0) + (max(0, duplicate_count - 1) * 4.0))

    # 3. Urgency Weight (0 - 15 points)
    urgency_map = {
        "CRITICAL": 15.0,
        "HIGH": 10.0,
        "MEDIUM": 5.0,
        "LOW": 0.0
    }
    urgency_component = urgency_map.get(urgency_level.upper(), 5.0)

    # 4. Aging Penalty (0 - 10 points)
    aging_component = 0.0
    if created_at:
        now = datetime.datetime.utcnow()
        hours_elapsed = max(0.0, (now - created_at).total_seconds() / 3600.0)
        # 1 point per 8 hours pending
        aging_component = min(10.0, (hours_elapsed / 8.0) * 1.5)

    # 5. Vulnerable Zone Bonus (0 - 10 points)
    vulnerable_bonus = 10.0 if is_vulnerable_zone else 0.0

    # Total Composite Score (0 - 100)
    raw_total = severity_component + crowd_component + urgency_component + aging_component + vulnerable_bonus
    priority_score = round(min(100.0, max(5.0, raw_total)), 1)

    # Escalation Tier
    if priority_score >= 80.0:
        escalation_tier = "CRITICAL_ESCALATION"
    elif priority_score >= 60.0:
        escalation_tier = "HIGH_PRIORITY"
    elif priority_score >= 35.0:
        escalation_tier = "NORMAL"
    else:
        escalation_tier = "LOW"

    return {
        "priority_score": priority_score,
        "escalation_tier": escalation_tier,
        "breakdown": {
            "severity_component": round(severity_component, 1),
            "crowd_component": round(crowd_component, 1),
            "urgency_component": round(urgency_component, 1),
            "aging_component": round(aging_component, 1),
            "vulnerable_zone_bonus": vulnerable_bonus
        }
    }
