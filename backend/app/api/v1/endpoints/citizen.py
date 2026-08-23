from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.complaint import Complaint
from app.models.category import Category
from app.models.audit import AuditLog
from app.schemas.complaint import (
    ComplaintCreate,
    CitizenSubmissionResponse,
    CitizenVoiceTranscribeResponse,
    ComplaintResponse
)
from app.schemas.category import CategoryResponse
from app.services.category_service import category_service
from app.services.complaint_service import complaint_service
from app.ai.pipeline import civic_pipeline

router = APIRouter()


@router.get("/categories", response_model=List[CategoryResponse], summary="List Public Civic Categories")
def get_public_categories(db: Session = Depends(get_db)):
    """Returns available categories with SLA targets for citizen reporting."""
    return category_service.get_all(db)


@router.post("/complaints", response_model=CitizenSubmissionResponse, status_code=status.HTTP_201_CREATED, summary="Submit Citizen Complaint")
def submit_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submits a new citizen complaint via voice/text in any language.
    Executes the full AI pipeline:
    - Language detection & English normalization
    - Category & Subcategory NLP classification
    - Multi-factor Severity scoring
    - Semantic & spatial deduplication
    - Infrastructure Priority Score (IPS)
    - Explainable AI recommendation generation
    """
    # 1. Execute AI Pipeline
    ai_result = civic_pipeline.process_complaint(
        raw_text=payload.raw_text,
        latitude=payload.latitude,
        longitude=payload.longitude,
        explicit_category_id=payload.category_id,
        db=db
    )

    resolved_category_id = ai_result["category_id"]
    category = db.query(Category).filter(Category.id == resolved_category_id).first()
    category_name = category.name if category else "General Civic Grievance"
    sla_hours = category.default_sla_hours if category else 48

    # 2. Persist in Database
    tracking_id = complaint_service.generate_tracking_id()
    while db.query(Complaint).filter(Complaint.tracking_id == tracking_id).first():
        tracking_id = complaint_service.generate_tracking_id()

    complaint = Complaint(
        tracking_id=tracking_id,
        citizen_name=payload.citizen_name,
        citizen_contact=payload.citizen_contact,
        raw_text=payload.raw_text,
        detected_language=ai_result["detected_language"],
        translated_text=ai_result["translated_text"],
        audio_url=payload.audio_url,
        image_url=payload.image_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        category_id=resolved_category_id,
        subcategory=ai_result.get("subcategory"),
        severity_score=ai_result["severity_score"],
        severity_level=ai_result["severity_level"],
        priority_score=ai_result["priority_score"],
        status="RECEIVED",
        cluster_id=None,
        is_duplicate=ai_result["is_duplicate"],
        parent_complaint_id=ai_result.get("parent_complaint_id"),
    )
    db.add(complaint)
    db.flush()

    # Initial Audit Trail
    audit = AuditLog(
        complaint_id=complaint.id,
        previous_status=None,
        new_status="RECEIVED",
        changed_by=payload.citizen_name or "Citizen Submission",
        notes=f"Registered via portal in {ai_result['detected_language'].upper()}. Category: {category_name}.",
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)

    # 3. Schedule background spatial cluster & hotspot update
    def recluster_job():
        from app.core.database import SessionLocal
        job_db = SessionLocal()
        try:
            civic_pipeline.run_cluster_and_trend_intelligence(job_db)
        finally:
            job_db.close()

    background_tasks.add_task(recluster_job)

    # 4. Construct citizen confirmation message
    if ai_result["is_duplicate"]:
        confirm_msg = f"Your grievance has been linked with an existing active report for this location to escalate priority."
    elif ai_result["severity_level"] in ["CRITICAL", "HIGH"]:
        confirm_msg = f"High priority detected near sensitive infrastructure. Municipal response dispatch initiated."
    else:
        confirm_msg = f"Your complaint has been successfully registered and routed to the {category_name} department."

    return CitizenSubmissionResponse(
        tracking_id=complaint.tracking_id,
        status=complaint.status,
        detected_language=complaint.detected_language,
        translated_text=complaint.translated_text,
        category_id=complaint.category_id,
        predicted_category=category_name,
        subcategory=complaint.subcategory,
        severity_score=complaint.severity_score,
        severity_level=complaint.severity_level,
        priority_score=complaint.priority_score,
        estimated_sla_hours=sla_hours,
        is_duplicate=complaint.is_duplicate,
        message=confirm_msg,
        xai_explanation=ai_result.get("xai_explanation")
    )


@router.get("/complaints/{tracking_id}", response_model=ComplaintResponse, summary="Track Complaint by Tracking ID")
def track_complaint(tracking_id: str, db: Session = Depends(get_db)):
    """Retrieves full status, SLA metrics, field crew progress, and resolution evidence for a citizen's tracking code."""
    from app.services.dispatch_service import dispatch_service
    from app.schemas.crew_assignment import CrewAssignmentResponse

    complaint = complaint_service.get_by_tracking_id(db, tracking_id)
    if not complaint:
        # Fallback to integer ID lookup if applicable
        if tracking_id.isdigit():
            complaint = complaint_service.get_by_id(db, int(tracking_id))

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with Tracking ID '{tracking_id.upper()}' was not found. Please verify the code."
        )

    resp = ComplaintResponse.model_validate(complaint)
    resp.sla_metrics = dispatch_service.calculate_sla(complaint)
    if complaint.crew_assignments:
        resp.current_assignment = CrewAssignmentResponse.model_validate(complaint.crew_assignments[0])
    return resp


@router.post("/complaints/{tracking_id}/feedback", status_code=status.HTTP_201_CREATED, summary="Submit Citizen Rating & Feedback")
def submit_citizen_feedback_by_tracking(
    tracking_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Submits 1-5 star citizen rating and satisfaction feedback for a resolved complaint."""
    from app.services.dispatch_service import dispatch_service
    from app.schemas.citizen_feedback import CitizenFeedbackCreate

    complaint = complaint_service.get_by_tracking_id(db, tracking_id)
    if not complaint and tracking_id.isdigit():
        complaint = complaint_service.get_by_id(db, int(tracking_id))

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with Tracking ID '{tracking_id.upper()}' was not found."
        )

    feedback_in = CitizenFeedbackCreate(
        rating=payload.get("rating", 5),
        feedback=payload.get("feedback"),
        citizen_name=payload.get("citizen_name") or complaint.citizen_name or "Citizen",
        citizen_id=payload.get("citizen_id"),
    )
    return dispatch_service.submit_citizen_feedback(db, complaint.id, feedback_in)


@router.get("/complaints/{tracking_id}/feedback", summary="Get Citizen Feedback")
def get_citizen_feedback_by_tracking(
    tracking_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves citizen rating and feedback for a tracking ID."""
    complaint = complaint_service.get_by_tracking_id(db, tracking_id)
    if not complaint and tracking_id.isdigit():
        complaint = complaint_service.get_by_id(db, int(tracking_id))

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with Tracking ID '{tracking_id.upper()}' was not found."
        )
    return complaint.citizen_feedback


@router.post("/voice-transcribe", response_model=CitizenVoiceTranscribeResponse, summary="Transcribe Voice Grievance")
def transcribe_voice(
    raw_text: str,
    db: Session = Depends(get_db)
):
    """Processes transcript from speech recognition, detects language, normalizes to English, and classifies category."""
    detection = civic_pipeline.process_complaint(raw_text=raw_text, latitude=0.0, longitude=0.0, db=db)
    category = db.query(Category).filter(Category.id == detection["category_id"]).first()
    category_name = category.name if category else "General Civic Grievance"

    return CitizenVoiceTranscribeResponse(
        detected_language=detection["detected_language"],
        raw_transcript=raw_text,
        translated_text=detection["translated_text"],
        predicted_category=category_name,
        predicted_subcategory=detection.get("subcategory"),
        confidence=detection.get("classification_confidence", 0.85)
    )

