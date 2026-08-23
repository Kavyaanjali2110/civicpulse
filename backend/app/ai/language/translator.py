import re
from typing import Dict, Any
from app.ai.language.detector import language_detector


class LanguageTranslator:
    """Translates and normalizes multilingual civic complaints into standard English."""

    # Lexicon mappings for Hindi/Marathi/Spanish to English
    CIVIC_TRANSLATION_MAP = {
        # Devanagari & Hindi
        "पानी": "water", "पाईप": "pipe", "पाइप": "pipe", "फूट": "burst", "फटा": "burst", "फुटला": "burst", "फट": "burst",
        "रस्ता": "road", "सड़क": "road", "सडक": "road", "मार्ग": "avenue", "गड्ढा": "pothole", "खड्डा": "pothole", "खड्डे": "potholes",
        "कचरा": "garbage", "कूड़ा": "garbage", "गंदगी": "waste", "दुर्गंध": "foul smell", "घाण": "dirt",
        "बिजली": "electricity", "तार": "wire", "केबल": "cable", "लाइट": "light", "बत्ती": "streetlight", "अंधेरा": "darkness",
        "गटर": "gutter", "गटार": "sewer", "नाले": "drain", "नाला": "drain", "सीवर": "sewage", "मैनहोल": "manhole",
        "ठिणग्या": "sparks", "चिंगारी": "sparks", "धुआं": "smoke", "आग": "fire", "धोका": "danger", "खतरा": "hazard",
        "रुग्णालय": "hospital", "अस्पताल": "hospital", "शाळा": "school", "स्कूल": "school", "विद्यालय": "school",
        "तातडीने": "urgently", "लवकर": "quickly", "जल्दी": "quickly", "दुरुस्त": "repair", "ठीक": "fix",
        "मोठा": "large", "बड़ा": "large", "खचला": "subsided", "वाहतूक": "traffic", "वाहने": "vehicles",
        "गेला": "gone", "झाला": "occurred", "आहे": "is", "नाही": "not", "पडला": "fallen", "पडले": "fallen",

        # Hinglish
        "paani": "water", "pani": "water", "pipe": "pipe", "phat": "burst", "toot": "broken",
        "sadak": "road", "gaddha": "pothole", "gaddhe": "potholes", "kachra": "garbage",
        "bijli": "electricity", "tar": "wire", "batti": "streetlight", "andhera": "darkness",
        "gutter": "sewer", "nala": "drain", "sewage": "sewage", "spark": "sparks",
        "bahut": "very", "bada": "huge", "danger": "danger", "bachhon": "children",
        "saamne": "in front of", "pass": "near", "gir": "fallen", "chuke": "have",

        # Spanish
        "fuga": "leak", "fugas": "leaks", "agua": "water", "bache": "pothole", "baches": "potholes",
        "calle": "street", "avenida": "avenue", "basura": "garbage", "poste": "pole",
        "luz": "light", "cable": "cable", "cables": "cables", "suelto": "loose",
        "inundacion": "flooding", "inundación": "flooding", "alcantarilla": "manhole",
        "frente": "in front of", "peligro": "danger", "roto": "broken", "rota": "broken",
        "urgente": "urgent", "masiva": "massive", "masivo": "massive"
    }

    # Phrase-level substitutions for common idioms
    PHRASE_RULES = [
        (r"(?i)\bpipe\s+phat\s+gaya\b", "pipe burst"),
        (r"(?i)\bwire\s+toot\s+kar\s+gir\s+gaya\b", "electrical wire snapped and fell"),
        (r"(?i)\bgaddha\s+hai\b", "there is a pothole"),
        (r"(?i)\bkachra\s+overflow\b", "garbage overflowing"),
        (r"(?i)\bspark\s+ho\s+raha\b", "sparking actively"),
        (r"(?i)\bgutter\s+overflow\b", "sewage overflowing"),
        (r"(?i)\bfuga\s+de\s+agua\b", "water leakage"),
        (r"(?i)\bposte\s+de\s+luz\b", "streetlight"),
    ]

    @classmethod
    def translate(cls, text: str, source_lang: str = None) -> Dict[str, Any]:
        """Translates non-English text to normalized English. If already English, returns clean normalized text."""
        if not text or not text.strip():
            return {"translated_text": "", "detected_language": "en", "is_translated": False}

        raw = text.strip()

        if not source_lang:
            detection = language_detector.detect(raw)
            source_lang = detection["language"]

        if source_lang == "en":
            cleaned = re.sub(r"\s+", " ", raw)
            return {"translated_text": cleaned, "detected_language": "en", "is_translated": False}

        # Apply phrase-level regex replacements first
        translated = raw
        for pattern, replacement in cls.PHRASE_RULES:
            translated = re.sub(pattern, replacement, translated)

        # Tokenize by whitespace and punctuation safely across Unicode scripts
        tokens = re.split(r"(\s+|[.,!?;:()\[\]\"'])", translated)
        translated_tokens = []

        for tok in tokens:
            if not tok:
                continue
            cleaned_tok = tok.strip().lower()
            if cleaned_tok in cls.CIVIC_TRANSLATION_MAP:
                translated_tokens.append(cls.CIVIC_TRANSLATION_MAP[cleaned_tok])
            else:
                translated_tokens.append(tok)

        result_text = "".join(translated_tokens)
        result_text = re.sub(r"\s+", " ", result_text).strip()

        if not result_text:
            result_text = raw

        return {
            "translated_text": result_text,
            "detected_language": source_lang,
            "is_translated": True
        }


language_translator = LanguageTranslator()
