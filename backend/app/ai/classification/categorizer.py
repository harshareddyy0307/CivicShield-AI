import re
from typing import Dict, Any, List, Optional

CATEGORY_KEYWORDS = {
    "pothole": [
        "pothole", "crater", "hole in road", "depression in asphalt", "road cavity", "hole in street"
    ],
    "damaged_road": [
        "crack", "uneven pavement", "broken road", "asphalt damaged", "alligator cracking",
        "surface damage", "worn road", "rutting", "cave in"
    ],
    "blocked_drain": [
        "blocked drain", "clogged drain", "drain overflow", "sewer blockage", "culvert blocked",
        "debris in drain", "storm drain clogged", "gutter blocked", "drain choked"
    ],
    "waterlogging": [
        "waterlogging", "water accumulation", "standing water", "flooded street", "submerged road",
        "water stagnating", "water pooling", "flooding", "water retention"
    ],
    "water_leakage": [
        "pipe burst", "water leak", "water pipe broken", "main line leak", "potable water leaking",
        "underground pipe leak"
    ],
    "garbage_accumulation": [
        "garbage", "trash pile", "waste dumped", "litter", "debris accumulation", "illegal dump",
        "overflowing dumpster", "refuse"
    ],
    "broken_streetlight": [
        "streetlight", "lamp post", "dark street", "light pole", "street light not working",
        "traffic signal light out"
    ],
    "road_obstruction": [
        "fallen tree", "construction debris blocking", "barrier on road", "boulder on road",
        "road blocked", "obstruction in lane"
    ],
    "damaged_public_infrastructure": [
        "guardrail", "damaged bridge", "collapsed wall", "signboard fallen", "manhole cover missing",
        "railing broken", "footpath broken"
    ]
}

CATEGORY_DEPARTMENT_MAPPING = {
    "pothole": "roads_bridges",
    "damaged_road": "roads_bridges",
    "blocked_drain": "water_sewerage",
    "waterlogging": "water_sewerage",
    "water_leakage": "water_sewerage",
    "garbage_accumulation": "sanitation",
    "broken_streetlight": "electrical",
    "road_obstruction": "roads_bridges",
    "damaged_public_infrastructure": "roads_bridges",
    "other": "general_administration"
}

class DeterministicCategorizer:
    """
    Deterministic rule-based categorization baseline for civic complaints.
    Complies with Section 05:
    - Returns predicted category, classification method, reasons, and whether human review is required.
    - Does NOT fabricate confidence scores for keyword matching.
    """
    def __init__(self):
        self.keywords = CATEGORY_KEYWORDS
        self.dept_mapping = CATEGORY_DEPARTMENT_MAPPING

    def classify(self, text: str, user_selected_category: Optional[str] = None) -> Dict[str, Any]:
        normalized_text = text.lower()
        matches_per_category: Dict[str, List[str]] = {}

        for cat, phrases in self.keywords.items():
            for phrase in phrases:
                pattern = r'\b' + re.escape(phrase) + r'\b'
                if re.search(pattern, normalized_text):
                    if cat not in matches_per_category:
                        matches_per_category[cat] = []
                    matches_per_category[cat].append(phrase)

        if not matches_per_category:
            final_category = user_selected_category if user_selected_category else "other"
            return {
                "predicted_category": final_category,
                "classification_method": "deterministic_keyword_rules",
                "classification_confidence": None,  # Explicitly None - no fabricated confidence
                "classification_reasons": "No unambiguous category keywords detected. Defaulted to user selection or generic classification.",
                "requires_human_review": True,
                "recommended_department_id": self.dept_mapping.get(final_category, "general_administration"),
                "matched_terms": []
            }

        # Select category with the highest match count
        best_category = max(matches_per_category.keys(), key=lambda k: len(matches_per_category[k]))
        matched_terms = matches_per_category[best_category]

        reasons = f"Matched keyword rules for '{best_category}' with terms: {', '.join(matched_terms)}."
        if user_selected_category and user_selected_category != best_category:
            reasons += f" Note: Citizen selected category '{user_selected_category}'."

        return {
            "predicted_category": best_category,
            "classification_method": "deterministic_keyword_rules",
            "classification_confidence": None,  # Explicitly None as specified in design requirements
            "classification_reasons": reasons,
            "requires_human_review": True,
            "recommended_department_id": self.dept_mapping.get(best_category, "roads_bridges"),
            "matched_terms": matched_terms
        }

categorizer = DeterministicCategorizer()
