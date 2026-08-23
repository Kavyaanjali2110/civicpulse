from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.ai.language.detector import language_detector
from app.ai.language.translator import language_translator
from app.ai.nlp.classifier import complaint_classifier
from app.ai.severity.severity_engine import severity_engine
from app.ai.clustering.deduplication import duplicate_detector
from app.ai.clustering.spatial_cluster import spatial_cluster_engine
from app.ai.scoring.priority_engine import priority_engine
from app.ai.trends.trend_analyzer import trend_analyzer
from app.ai.explainability.xai_engine import xai_engine
from app.models.category import Category


class CivicIntelligencePipeline:
    """End-to-End Multilingual AI Pipeline for Citizen Feedback and Infrastructure Intelligence."""

    @classmethod
    def process_complaint(
        cls,
        raw_text: str,
        latitude: float,
        longitude: float,
        explicit_category_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Executes the complete multi-stage AI intelligence pipeline on a citizen grievance."""
        # 1. Language Detection
        detection_result = language_detector.detect(raw_text)
        detected_lang = detection_result["language"]

        # 2. Translation and Normalization
        translation_result = language_translator.translate(raw_text, source_lang=detected_lang)
        translated_text = translation_result["translated_text"]

        # 3. Category Classification
        nlp_result = complaint_classifier.predict(translated_text)
        predicted_category_code = nlp_result["category_code"]
        predicted_subcategory = nlp_result["subcategory"]

        # Resolve category ID if db session is available
        category_id = explicit_category_id
        if db and not category_id:
            cat = db.query(Category).filter(Category.code == predicted_category_code).first()
            if cat:
                category_id = cat.id
        category_id = category_id or 1

        # 4. Multi-Factor Severity Scoring
        severity_result = severity_engine.calculate_severity(
            text=translated_text,
            category_code=predicted_category_code,
            latitude=latitude,
            longitude=longitude,
            db=db
        )
        severity_score = severity_result["severity_score"]
        severity_level = severity_result["severity_level"]
        urgency_kws = severity_result["matched_urgency_keywords"]

        # 5. Semantic & Geospatial Deduplication
        is_duplicate = False
        parent_id = None
        similarity = 0.0
        if db:
            is_dup, p_id, sim = duplicate_detector.find_duplicate(
                db=db,
                text=translated_text,
                category_id=category_id,
                latitude=latitude,
                longitude=longitude
            )
            is_duplicate = is_dup
            parent_id = p_id
            similarity = sim

        # 6. Infrastructure Priority Score (IPS)
        ips_result = priority_engine.calculate_ips(
            severity_score=severity_score,
            latitude=latitude,
            longitude=longitude,
            cluster_complaint_count=2 if is_duplicate else 1,
            created_at=datetime.now(timezone.utc),
            db=db
        )
        priority_score = ips_result["priority_score"]

        # 7. Explainable AI (XAI) Recommendation
        xai_result = xai_engine.generate_explanation(
            category_code=predicted_category_code,
            severity_score=severity_score,
            severity_level=severity_level,
            priority_score=priority_score,
            cluster_count=2 if is_duplicate else 1,
            nearest_asset_name=severity_result.get("nearest_infrastructure"),
            nearest_distance_m=severity_result.get("distance_to_infrastructure_m"),
            urgency_keywords=urgency_kws
        )

        return {
            "detected_language": detected_lang,
            "translated_text": translated_text,
            "predicted_category_code": predicted_category_code,
            "category_id": category_id,
            "subcategory": predicted_subcategory,
            "classification_confidence": nlp_result["confidence"],
            "classification_probabilities": nlp_result["probabilities"],
            "keywords": nlp_result["keywords"],
            "severity_score": severity_score,
            "severity_level": severity_level,
            "priority_score": priority_score,
            "is_duplicate": is_duplicate,
            "parent_complaint_id": parent_id,
            "similarity_to_parent": similarity,
            "urgency_keywords": urgency_kws,
            "nearest_infrastructure": severity_result.get("nearest_infrastructure"),
            "distance_to_infrastructure_m": severity_result.get("distance_to_infrastructure_m"),
            "xai_explanation": xai_result,
        }

    @classmethod
    def run_cluster_and_trend_intelligence(cls, db: Session) -> Dict[str, Any]:
        """Runs batch geospatial DBSCAN clustering and trend spike detection."""
        clusters = spatial_cluster_engine.run_clustering(db)
        trends = trend_analyzer.analyze_trends(db)
        return {
            "clusters_updated": len(clusters),
            "clusters": clusters,
            "trends": trends
        }


civic_pipeline = CivicIntelligencePipeline()
