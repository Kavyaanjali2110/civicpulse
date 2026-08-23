import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.db.seed_data import seed_database
from app.ai.language.detector import language_detector
from app.ai.language.translator import language_translator
from app.ai.nlp.classifier import complaint_classifier
from app.ai.nlp.extractor import entity_extractor
from app.ai.severity.severity_engine import severity_engine
from app.ai.clustering.deduplication import duplicate_detector
from app.ai.clustering.spatial_cluster import spatial_cluster_engine
from app.ai.scoring.priority_engine import priority_engine
from app.ai.trends.trend_analyzer import trend_analyzer
from app.ai.explainability.xai_engine import xai_engine
from app.ai.pipeline import civic_pipeline

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session, force=True)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_language_detection():
    # Hindi (Devanagari)
    res_hi = language_detector.detect("अस्पताल के सामने पानी का पाइप फट गया है")
    assert res_hi["language"] == "hi"

    # Marathi (Devanagari)
    res_mr = language_detector.detect("रस्त्यावर मोठा खड्डा पडला असून तातडीने दुरुस्त करा")
    assert res_mr["language"] == "mr"

    # Hinglish
    res_hinglish = language_detector.detect("Sadak pe bahut bada gaddha hai aur pipe phat gaya hai")
    assert res_hinglish["language"] == "hi"

    # Spanish
    res_es = language_detector.detect("Fuga masiva de agua en la calle frente al hospital")
    assert res_es["language"] == "es"

    # English
    res_en = language_detector.detect("Dangerous pothole near the central metro station")
    assert res_en["language"] == "en"


def test_language_translation():
    # Translate Hindi to normalized English
    trans_hi = language_translator.translate("पानी का पाइप फट गया है hospital के पास", source_lang="hi")
    assert "water" in trans_hi["translated_text"].lower()
    assert "pipe" in trans_hi["translated_text"].lower()
    assert trans_hi["is_translated"] is True

    # Translate Spanish
    trans_es = language_translator.translate("Fuga de agua y bache peligroso en la calle", source_lang="es")
    assert "leak" in trans_es["translated_text"].lower() or "water" in trans_es["translated_text"].lower()
    assert "pothole" in trans_es["translated_text"].lower()


def test_complaint_classifier():
    # Roads
    pred_roads = complaint_classifier.predict("Deep crater pothole on expressway causing tire punctures")
    assert pred_roads["category_code"] == "ROADS"
    assert pred_roads["confidence"] >= 0.25

    # Electricity
    pred_elec = complaint_classifier.predict("High voltage power wire snapped and sparking on sidewalk")
    assert pred_elec["category_code"] == "ELECTRICITY"

    # Water
    pred_water = complaint_classifier.predict("Underground drinking water main pipeline burst flooding street")
    assert pred_water["category_code"] == "WATER"

    # Sewage
    pred_sew = complaint_classifier.predict("Open manhole overflowing with toxic sewage water")
    assert pred_sew["category_code"] == "SEWAGE"


def test_severity_engine(db_session):
    # High urgency electrical sparking near hospital
    sev = severity_engine.calculate_severity(
        text="Sparking live wire fire hazard outside City Memorial Hospital",
        category_code="ELECTRICITY",
        latitude=19.0812,
        longitude=72.8811,
        db=db_session
    )
    assert sev["severity_score"] >= 0.75
    assert sev["severity_level"] in ["HIGH", "CRITICAL"]
    assert "spark" in sev["matched_urgency_keywords"] or "fire" in sev["matched_urgency_keywords"]


def test_duplicate_detector(db_session):
    from app.models.category import Category
    water_cat = db_session.query(Category).filter(Category.code == "WATER").first()
    assert water_cat is not None

    # Co-located water burst complaint matching existing seed complaint at (19.0814, 72.8809)
    is_dup, parent_id, sim = duplicate_detector.find_duplicate(
        db=db_session,
        text="A major water pipe burst on hospital road gushing water and causing obstruction",
        category_id=water_cat.id,
        latitude=19.0814,
        longitude=72.8809
    )
    assert is_dup is True
    assert parent_id is not None
    assert sim >= 0.35


def test_spatial_clustering_dbscan(db_session):
    clusters = spatial_cluster_engine.run_clustering(db_session, eps_meters=350.0, min_samples=2)
    assert len(clusters) >= 2
    for cl in clusters:
        assert cl["count"] >= 2
        assert cl["avg_severity"] > 0


def test_priority_score_ips(db_session):
    ips_res = priority_engine.calculate_ips(
        severity_score=0.90,
        latitude=19.0812,
        longitude=72.8811,
        cluster_complaint_count=5,
        db=db_session
    )
    assert ips_res["priority_score"] >= 75.0
    assert "severity_points" in ips_res["components"]


def test_xai_engine():
    explanation = xai_engine.generate_explanation(
        category_code="WATER",
        severity_score=0.92,
        severity_level="CRITICAL",
        priority_score=94.5,
        cluster_count=6,
        nearest_asset_name="City Memorial Hospital",
        nearest_distance_m=110.0,
        urgency_keywords=["burst", "flooding", "ambulance"]
    )
    assert explanation["estimated_population_impact"] == "HIGH"
    assert "DISPATCH" in explanation["tactical_action_plan"]
    assert len(explanation["primary_contributing_factors"]) >= 3


def test_end_to_end_pipeline(db_session):
    # Raw Hindi input
    result = civic_pipeline.process_complaint(
        raw_text="Hospital ke saamne water pipe phat gaya hai aur ambulance fas gayi hai",
        latitude=19.0814,
        longitude=72.8809,
        db=db_session
    )
    assert result["detected_language"] == "hi"
    assert result["predicted_category_code"] == "WATER"
    assert result["severity_score"] >= 0.70
    assert result["priority_score"] >= 60.0
    assert result["xai_explanation"] is not None
