import os
import joblib
from typing import Dict, Any, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from app.ai.nlp.extractor import entity_extractor

MODEL_PATH = "./data/models/classifier.joblib"

TRAINING_DATA: List[Tuple[str, str]] = [
    # ROADS
    ("Deep pothole on main road causing vehicle damage and accidents", "ROADS"),
    ("Huge crater in the middle of the street near market junction", "ROADS"),
    ("Asphalt is completely eroded, sharp rocks causing flat tires", "ROADS"),
    ("Dangerous road sinkhole cave in after heavy rain", "ROADS"),
    ("Broken speed breaker damaged without yellow paint warning", "ROADS"),
    ("Road surface worn out and full of bumps and trenches", "ROADS"),
    ("Two wheelers slipping due to loose gravel on damaged street", "ROADS"),
    ("Flyover approach road has massive potholes blocking traffic", "ROADS"),
    ("Bicycle fell into unmarked road trench near bus stop", "ROADS"),
    ("Footpath tiles broken and missing paving stones on highway", "ROADS"),

    # WATER
    ("Drinking water pipeline burst gushing thousands of liters of clean water", "WATER"),
    ("No water supply in our residential building for the last 3 days", "WATER"),
    ("Main water pipe cracked flooding the avenue in front of hospital", "WATER"),
    ("Contaminated dirty brown water coming from municipal tap", "WATER"),
    ("Low water pressure, barely a trickle from ground floor tap", "WATER"),
    ("Water distribution valve broken leaking continuously into street", "WATER"),
    ("Underground drinking water line ruptured near metro pillar", "WATER"),
    ("Sewage mixing with drinking water supply causing foul smell", "WATER"),
    ("Water reservoir tank overflowing and wasting fresh water", "WATER"),
    ("Pipeline leak under road creating hollow water bubble under tarmac", "WATER"),

    # WASTE
    ("Garbage dump overflowing onto main street attracting stray dogs", "WASTE"),
    ("Waste collection truck has not arrived for four days", "WASTE"),
    ("Illegal dumping of construction debris on pedestrian footpath", "WASTE"),
    ("Rotting trash pile emitting unbearable foul stench near school", "WASTE"),
    ("Community dustbins broken and garbage scattered all over road", "WASTE"),
    ("Dead stray animal carcass lying on street corner for two days", "WASTE"),
    ("Hazardous medical waste dumped in public alleyway", "WASTE"),
    ("Commercial market dumping rotting vegetable waste in open plot", "WASTE"),
    ("Plastic waste and bottles choking the side alley", "WASTE"),
    ("Littering and uncleaned street after weekly farmer market", "WASTE"),

    # ELECTRICITY
    ("High voltage electric cable snapped and fallen on pavement sparking actively", "ELECTRICITY"),
    ("Transformer explosion with smoke and loud humming noise", "ELECTRICITY"),
    ("Streetlights completely dark on entire school road at night", "ELECTRICITY"),
    ("Open DP distribution box with exposed live wires reachable by children", "ELECTRICITY"),
    ("Power fluctuation and continuous surge damaging home appliances", "ELECTRICITY"),
    ("Electric pole leaning dangerously over vehicular road", "ELECTRICITY"),
    ("Sparking wire near tree creating fire hazard during wind", "ELECTRICITY"),
    ("Streetlight pole current leakage giving mild shock to passersby", "ELECTRICITY"),
    ("Broken streetlight fixture dangling from overhead wire", "ELECTRICITY"),
    ("Underground power cable short circuit causing blackout in sector", "ELECTRICITY"),

    # SEWAGE
    ("Gutter manhole overflowing with black sewage water onto street", "SEWAGE"),
    ("Missing manhole cover on dark road, huge risk of people falling in", "SEWAGE"),
    ("Underground sewer blocked causing toilet backflow into homes", "SEWAGE"),
    ("Open drain choked with silt causing monsoon flood on road", "SEWAGE"),
    ("Toxic sewage smell emanating from broken storm water drain", "SEWAGE"),
    ("Broken concrete slab over storm drain chamber collapsed", "SEWAGE"),
    ("Sewage water logging up to knee level outside hospital gates", "SEWAGE"),
    ("Gutter lid broken after heavy truck drove over it", "SEWAGE"),
    ("Sewer pipe leakage leaking dirty wastewater into open ground", "SEWAGE"),
    ("Manhole chamber overflowing during light rain due to clogged drainage", "SEWAGE"),

    # SAFETY
    ("Traffic signal light stuck on red in all directions creating gridlock", "SAFETY"),
    ("Large dead tree branch hanging dangerously over railway overpass", "SAFETY"),
    ("Pedestrian crossing zebra markings completely erased on highway", "SAFETY"),
    ("Broken road divider iron railing with sharp edges pointing outwards", "SAFETY"),
    ("Fallen tree blocking two lanes of arterial expressway", "SAFETY"),
    ("No street signs or blind turn mirror on dangerous hill curve", "SAFETY"),
    ("Construction crane operating without safety barriers over pedestrian walkway", "SAFETY"),
    ("Traffic signal timer countdown broken causing collisions at junction", "SAFETY"),
    ("Collapsed roadside barrier on bridge over river", "SAFETY"),
    ("Unauthorized illegal barricades blocking emergency fire tender access", "SAFETY"),
]


class ComplaintClassifier:
    """TF-IDF + Logistic Regression multi-class civic complaint classifier."""

    def __init__(self):
        self.model: Pipeline = None
        self._initialize_model()

    def _initialize_model(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception:
                pass
        self.train_and_save()

    def train_and_save(self):
        """Trains TF-IDF + LogisticRegression pipeline and serializes model."""
        texts = [item[0] for item in TRAINING_DATA]
        labels = [item[1] for item in TRAINING_DATA]

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
            ("clf", LogisticRegression(C=3.0, max_iter=300, random_state=42))
        ])

        pipeline.fit(texts, labels)
        self.model = pipeline
        try:
            joblib.dump(self.model, MODEL_PATH)
        except Exception:
            pass

    def predict(self, text: str) -> Dict[str, Any]:
        """Predicts the category of the civic complaint with probability confidence."""
        if not text or not text.strip():
            return {
                "category_code": "ROADS",
                "confidence": 0.5,
                "probabilities": {},
                "subcategory": "General Civic Issue",
                "keywords": []
            }

        if self.model is None:
            self._initialize_model()

        cleaned = text.strip()
        predicted_category = self.model.predict([cleaned])[0]
        probabilities_array = self.model.predict_proba([cleaned])[0]
        classes = self.model.classes_

        prob_dict = {
            classes[i]: round(float(probabilities_array[i]), 3)
            for i in range(len(classes))
        }
        confidence = prob_dict.get(predicted_category, 0.75)

        # Extract subcategory & keywords
        subcategory = entity_extractor.extract_subcategory(predicted_category, cleaned)
        keywords = entity_extractor.extract_keywords(cleaned, max_keywords=5)

        return {
            "category_code": predicted_category,
            "confidence": confidence,
            "probabilities": prob_dict,
            "subcategory": subcategory,
            "keywords": keywords
        }


complaint_classifier = ComplaintClassifier()
