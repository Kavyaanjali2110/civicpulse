import re
from typing import List, Dict, Optional

SUBCATEGORY_RULES: Dict[str, Dict[str, List[str]]] = {
    "ROADS": {
        "Severe Pothole": ["pothole", "gaddha", "crater", "hole", "bache", "deep hole"],
        "Damaged Tarmac": ["tarmac", "asphalt", "eroded", "road surface", "broken road", "cracks"],
        "Broken Speed Breaker": ["speed breaker", "speed bump", "breaker"],
        "Road Cave-in / Sinkhole": ["cave-in", "sinkhole", "collapsed road", "subsidence"],
    },
    "WATER": {
        "Main Pipeline Burst": ["pipeline burst", "pipe burst", "pipe phat", "gushing", "cracked pipe"],
        "Water Supply Outage": ["supply stopped", "no water", "outage", "dry tap", "pani nahi"],
        "Water Contamination": ["dirty water", "contaminated", "brown water", "foul smell water", "turbid"],
        "Low Water Pressure": ["low pressure", "trickle", "weak pressure"],
    },
    "WASTE": {
        "Uncollected Garbage": ["garbage dump", "uncollected", "kachra", "overflowing bin", "trash pile", "dustbin"],
        "Illegal Debris Dumping": ["debris", "construction waste", "illegal dump", "malba"],
        "Dead Animal / Biohazard": ["dead animal", "carcass", "hazardous waste"],
    },
    "ELECTRICITY": {
        "Live Wire Sparking": ["spark", "sparking", "live wire", "wire fell", "cable snapped", "chispas"],
        "Open Transformer Box": ["transformer", "dp box", "junction box", "high voltage"],
        "Streetlight Failure": ["streetlight", "street light", "dark street", "light off", "pitch black", "batti"],
        "Exposed Cable": ["exposed cable", "hanging wire", "loose wire", "cable suelto"],
    },
    "SEWAGE": {
        "Manhole Overflow": ["manhole", "gutter overflow", "sewer overflow", "ganda pani"],
        "Missing / Broken Manhole Lid": ["missing manhole", "broken lid", "open drain", "open chamber", "open sewer"],
        "Underground Drain Blockage": ["blocked drain", "sewage blockage", "choked drain", "backflow"],
    },
    "SAFETY": {
        "Traffic Signal Fault": ["traffic signal", "signal stuck", "traffic light", "red light"],
        "Hazardous Fallen Tree": ["fallen tree", "tree branch", "hanging branch"],
        "Broken Footpath / Railing": ["broken footpath", "pavement damaged", "missing railing", "pedestrian"],
    }
}


class EntityExtractor:
    """Extracts subcategories and salient civic entities from complaint text."""

    @classmethod
    def extract_subcategory(cls, category_code: str, text: str) -> Optional[str]:
        if not text:
            return None
        
        category_code = category_code.upper()
        rules = SUBCATEGORY_RULES.get(category_code, {})
        text_lower = text.lower()

        for subcat, keywords in rules.items():
            for kw in keywords:
                if kw in text_lower:
                    return subcat

        # Default subcategory based on category
        defaults = {
            "ROADS": "General Road Repair",
            "WATER": "Water Pipeline Issue",
            "WASTE": "General Waste Management",
            "ELECTRICITY": "Electrical Infrastructure",
            "SEWAGE": "Drainage & Sewer Issue",
            "SAFETY": "Public Safety Concern",
        }
        return defaults.get(category_code, "General Civic Grievance")

    @classmethod
    def extract_keywords(cls, text: str, max_keywords: int = 5) -> List[str]:
        """Extracts significant civic terms from text."""
        stopwords = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with",
            "is", "was", "are", "were", "has", "have", "had", "it", "this", "that",
            "near", "due", "by", "of", "from", "our", "my", "we", "i", "there", "pe", "ke", "hai"
        }
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        meaningful = [w for w in words if w not in stopwords]
        
        # Deduplicate preserving order
        seen = set()
        unique = []
        for w in meaningful:
            if w not in seen:
                seen.add(w)
                unique.append(w)
        return unique[:max_keywords]


entity_extractor = EntityExtractor()
