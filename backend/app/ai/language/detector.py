import re
from typing import Dict, Any


class LanguageDetector:
    """Multilingual script and keyword detector for civic grievances."""

    # Unicode ranges for major Indian scripts
    SCRIPT_RANGES = {
        "hi_mr": (0x0900, 0x097F),  # Devanagari (Hindi / Marathi)
        "bn": (0x0980, 0x09FF),     # Bengali
        "ta": (0x0B80, 0x0BFF),     # Tamil
        "te": (0x0C00, 0x0C7F),     # Telugu
        "kn": (0x0C80, 0x0CFF),     # Kannada
        "gu": (0x0A80, 0x0AFF),     # Gujarati
        "pa": (0x0A00, 0x0A7F),     # Gurmukhi / Punjabi
    }

    # Distinctive Marathi stems & keywords vs Hindi
    MARATHI_INDICATORS = [
        "आहे", "नाही", "रस्ता", "रस्त्यावर", "खड्डा", "पाणी", "पाईप", "फुटला", "झाले", "झाला",
        "तातडीने", "करा", "दुरुस्त", "कचरा", "शाळेजवळील", "समोरील", "घरी", "येथे", "पडला", "असून", "मोठा"
    ]

    # Romanized Hinglish vocabulary
    HINGLISH_KEYWORDS = {
        "paani", "pani", "gaddha", "sadak", "kachra", "bijli", "batti", "toot",
        "phat", "gaya", "hai", "nahi", "raha", "rahi", "bahut", "bada", "danger",
        "aaya", "kripya", "jaldi", "karo", "saamne", "pass", "ke", "me", "se", "pe"
    }

    # Spanish vocabulary
    SPANISH_KEYWORDS = {
        "el", "la", "los", "las", "un", "una", "de", "en", "con", "por", "para",
        "fuga", "agua", "bache", "baches", "calle", "basura", "poste", "luz", "cable",
        "inundacion", "inundación", "alcantarilla", "frente", "hospital", "roto", "peligro", "masiva"
    }

    @classmethod
    def detect(cls, text: str) -> Dict[str, Any]:
        """Detects the primary language of the text. Returns ISO code and confidence score."""
        if not text or not text.strip():
            return {"language": "en", "confidence": 1.0, "script": "Latin"}

        cleaned = text.strip()

        # 1. Script Analysis based on character code points
        script_counts = {k: 0 for k in cls.SCRIPT_RANGES}
        total_chars = 0

        for char in cleaned:
            if char.isalpha():
                total_chars += 1
                cp = ord(char)
                for script, (start, end) in cls.SCRIPT_RANGES.items():
                    if start <= cp <= end:
                        script_counts[script] += 1
                        break

        # Check if non-Latin script dominates
        for script, count in script_counts.items():
            if total_chars > 0 and (count / total_chars) > 0.20:
                if script == "hi_mr":
                    # Disambiguate Marathi vs Hindi in Devanagari via indicator check
                    for indicator in cls.MARATHI_INDICATORS:
                        if indicator in cleaned:
                            return {"language": "mr", "confidence": 0.95, "script": "Devanagari"}
                    return {"language": "hi", "confidence": 0.95, "script": "Devanagari"}
                return {"language": script, "confidence": 0.95, "script": script}

        # 2. Vocabulary checks for Latin-script text (Hinglish, Spanish, English)
        tokens = [t.lower() for t in re.findall(r"\b[a-zA-Z]+\b", cleaned)]
        token_set = set(tokens)

        # Check Spanish
        spanish_matches = token_set.intersection(cls.SPANISH_KEYWORDS)
        if len(spanish_matches) >= 2 or (len(tokens) <= 4 and len(spanish_matches) >= 1):
            conf = min(0.95, 0.5 + 0.15 * len(spanish_matches))
            return {"language": "es", "confidence": conf, "script": "Latin"}

        # Check Hinglish
        hinglish_matches = token_set.intersection(cls.HINGLISH_KEYWORDS)
        if len(hinglish_matches) >= 2 or (len(tokens) <= 4 and len(hinglish_matches) >= 1):
            conf = min(0.95, 0.5 + 0.15 * len(hinglish_matches))
            return {"language": "hi", "confidence": conf, "script": "Latin (Hinglish)"}

        # Default fallback is English
        return {"language": "en", "confidence": 0.90, "script": "Latin"}


language_detector = LanguageDetector()
