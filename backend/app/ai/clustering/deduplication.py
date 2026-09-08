from typing import Optional, Tuple, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models.complaint import Complaint
from app.services.infrastructure_service import infrastructure_service


class DuplicateDetector:
    """Semantic and geospatial duplicate / related complaint detector."""

    SPATIAL_THRESHOLD_METERS = 200.0
    SIMILARITY_THRESHOLD = 0.30
    TEMPORAL_WINDOW_DAYS = 14

    @classmethod
    def find_duplicate(
        cls,
        db: Session,
        text: str,
        category_id: int,
        latitude: float,
        longitude: float,
    ) -> Tuple[bool, Optional[int], float]:
        """Finds if a similar complaint exists within the spatial, temporal, and semantic thresholds.
        Returns: (is_duplicate: bool, parent_complaint_id: Optional[int], similarity_score: float)
        """
        # 1. Fetch recent candidate complaints in same category that are not resolved
        candidates: List[Complaint] = (
            db.query(Complaint)
            .filter(
                Complaint.category_id == category_id,
                Complaint.status != "RESOLVED",
            )
            .all()
        )

        if not candidates:
            return False, None, 0.0

        # Filter by age in Python to prevent DB timezone dialect mismatch
        now = datetime.now(timezone.utc)
        recent_candidates = []
        for cand in candidates:
            c_time = cand.created_at
            if c_time.tzinfo is None:
                c_time = c_time.replace(tzinfo=timezone.utc)
            if (now - c_time).days <= cls.TEMPORAL_WINDOW_DAYS:
                recent_candidates.append(cand)

        if not recent_candidates:
            return False, None, 0.0

        # 2. Filter candidates by spatial distance
        if latitude is None or longitude is None:
            return False, None, 0.0

        spatially_close = []
        for cand in recent_candidates:
            if cand.latitude is None or cand.longitude is None:
                continue
            dist = infrastructure_service.calculate_distance_meters(
                latitude, longitude, cand.latitude, cand.longitude
            )
            if dist <= cls.SPATIAL_THRESHOLD_METERS:
                spatially_close.append(cand)

        if not spatially_close:
            return False, None, 0.0

        # 3. Calculate semantic cosine similarity using unigram TF-IDF
        candidate_texts = [c.translated_text or c.raw_text for c in spatially_close]
        all_texts = [text] + candidate_texts

        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 1), stop_words="english", min_df=1)
            tfidf_matrix = vectorizer.fit_transform(all_texts)
            sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

            best_idx = int(sims.argmax())
            best_score = float(sims[best_idx])

            if best_score >= cls.SIMILARITY_THRESHOLD:
                parent = spatially_close[best_idx]
                parent_id = parent.parent_complaint_id if parent.is_duplicate else parent.id
                return True, parent_id, round(best_score, 3)

            return False, None, round(best_score, 3)
        except Exception:
            return False, None, 0.0


duplicate_detector = DuplicateDetector()
