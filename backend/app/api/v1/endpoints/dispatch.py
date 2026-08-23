from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.department import Department
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.resolution_evidence import ResolutionEvidence
from app.models.citizen_feedback import CitizenFeedback
from app.models.complaint import Complaint
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.schemas.field_crew import FieldCrewCreate, FieldCrewUpdate, FieldCrewResponse
from app.schemas.crew_assignment import CrewAssignmentCreate, CrewAssignmentAction, CrewAssignmentResponse
from app.schemas.resolution_evidence import ResolutionEvidenceCreate, ResolutionEvidenceResponse
from app.schemas.citizen_feedback import CitizenFeedbackCreate, CitizenFeedbackResponse
from app.schemas.complaint import ComplaintResponse
from app.services.department_service import department_service
from app.services.field_crew_service import field_crew_service
from app.services.dispatch_service import dispatch_service
from app.services.complaint_service import complaint_service

router = APIRouter()


# ==========================================
# 1. DEPARTMENTS
# ==========================================
@router.get("/departments", response_model=List[DepartmentResponse], summary="List Municipal Departments")
def list_departments(
    active_only: bool = Query(False, description="Filter for active departments only"),
    db: Session = Depends(get_db)
):
    """Retrieves municipal departments with field crew counts."""
    departments = department_service.get_all(db, active_only=active_only)
    result = []
    for d in departments:
        resp = DepartmentResponse.model_validate(d)
        resp.crews_count = len(d.crews or [])
        result.append(resp)
    return result


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Department")
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db)
):
    """Creates a new municipal department."""
    existing = department_service.get_by_name(db, payload.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department with name '{payload.name}' already exists."
        )
    dept = department_service.create(db, payload)
    resp = DepartmentResponse.model_validate(dept)
    resp.crews_count = 0
    return resp


# ==========================================
# 2. FIELD CREWS
# ==========================================
@router.get("/crews", response_model=List[FieldCrewResponse], summary="List Field Crews")
def list_crews(
    department_id: Optional[int] = Query(None, description="Filter by department"),
    ward_id: Optional[int] = Query(None, description="Filter by ward zone"),
    active_only: bool = Query(False, description="Filter active crews only"),
    db: Session = Depends(get_db)
):
    """Lists field repair crews with active assignment counts."""
    crews = field_crew_service.get_all(
        db, department_id=department_id, ward_id=ward_id, active_only=active_only
    )
    result = []
    for c in crews:
        resp = FieldCrewResponse.model_validate(c)
        resp.active_assignments_count = field_crew_service.get_active_workload(db, c.id)
        result.append(resp)
    return result


@router.post("/crews", response_model=FieldCrewResponse, status_code=status.HTTP_201_CREATED, summary="Create Field Crew")
def create_crew(
    payload: FieldCrewCreate,
    db: Session = Depends(get_db)
):
    """Creates a new municipal field crew."""
    dept = department_service.get_by_id(db, payload.department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {payload.department_id} not found."
        )
    crew = field_crew_service.create(db, payload)
    resp = FieldCrewResponse.model_validate(crew)
    resp.active_assignments_count = 0
    return resp


@router.get("/crews/{id}", response_model=FieldCrewResponse, summary="Get Field Crew Detail")
def get_crew(id: int, db: Session = Depends(get_db)):
    """Retrieves detail for a specific field crew."""
    crew = field_crew_service.get_by_id(db, id)
    if not crew:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field crew with ID {id} not found."
        )
    resp = FieldCrewResponse.model_validate(crew)
    resp.active_assignments_count = field_crew_service.get_active_workload(db, crew.id)
    return resp


@router.put("/crews/{id}", response_model=FieldCrewResponse, summary="Update Field Crew")
def update_crew(
    id: int,
    payload: FieldCrewUpdate,
    db: Session = Depends(get_db)
):
    """Updates field crew attributes such as status, contact, or leader."""
    crew = field_crew_service.get_by_id(db, id)
    if not crew:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field crew with ID {id} not found."
        )
    updated = field_crew_service.update(db, crew, payload)
    resp = FieldCrewResponse.model_validate(updated)
    resp.active_assignments_count = field_crew_service.get_active_workload(db, updated.id)
    return resp


@router.get("/crews/{id}/assigned-complaints", response_model=List[ComplaintResponse], summary="List Complaints Assigned to Crew")
def get_crew_assigned_complaints(
    id: int,
    status: Optional[str] = Query(None, description="Filter by assignment status (ASSIGNED, IN_PROGRESS, etc.)"),
    db: Session = Depends(get_db)
):
    """Retrieves all complaints assigned to a particular field crew."""
    crew = field_crew_service.get_by_id(db, id)
    if not crew:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field crew with ID {id} not found."
        )
    complaints = field_crew_service.get_assigned_complaints(db, id, status=status)
    result = []
    for c in complaints:
        resp = ComplaintResponse.model_validate(c)
        resp.sla_metrics = dispatch_service.calculate_sla(c)
        if c.crew_assignments:
            resp.current_assignment = CrewAssignmentResponse.model_validate(c.crew_assignments[0])
        result.append(resp)
    return result


# ==========================================
# 3. COMPLAINT ASSIGNMENT & CREW WORKFLOW
# ==========================================
@router.post("/complaints/{id}/assign", response_model=CrewAssignmentResponse, status_code=status.HTTP_201_CREATED, summary="Assign Crew to Complaint")
def assign_crew_to_complaint(
    id: int,
    payload: CrewAssignmentCreate,
    db: Session = Depends(get_db)
):
    """Dispatches a municipal field crew to a complaint ticket."""
    payload.complaint_id = id
    assignment = dispatch_service.assign_crew(db, id, payload)
    return assignment


@router.get("/complaints/{id}/assignment", response_model=Optional[CrewAssignmentResponse], summary="Get Current Assignment for Complaint")
def get_complaint_assignment(id: int, db: Session = Depends(get_db)):
    """Gets the active or most recent crew assignment for a complaint."""
    complaint = complaint_service.get_by_id(db, id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} not found."
        )
    if not complaint.crew_assignments:
        return None
    return complaint.crew_assignments[0]


@router.post("/assignments/{id}/accept", response_model=CrewAssignmentResponse, summary="Accept Crew Assignment")
def accept_crew_assignment(
    id: int,
    payload: CrewAssignmentAction,
    db: Session = Depends(get_db)
):
    """Field crew acknowledges and accepts assigned ticket."""
    return dispatch_service.accept_assignment(db, id, payload)


@router.post("/assignments/{id}/start", response_model=CrewAssignmentResponse, summary="Start Field Work")
def start_crew_assignment(
    id: int,
    payload: CrewAssignmentAction,
    db: Session = Depends(get_db)
):
    """Field crew arrives on-site and initiates repair work (transitions complaint to IN_PROGRESS)."""
    return dispatch_service.start_work(db, id, payload)


@router.post("/assignments/{id}/complete", response_model=CrewAssignmentResponse, summary="Complete Assignment & Resolve Complaint")
def complete_crew_assignment(
    id: int,
    payload: CrewAssignmentAction,
    db: Session = Depends(get_db)
):
    """Completes assignment and marks complaint RESOLVED once photographic proof is present."""
    return dispatch_service.complete_assignment(db, id, payload)


# ==========================================
# 4. RESOLUTION EVIDENCE
# ==========================================
@router.post("/complaints/{id}/resolution-evidence", response_model=ResolutionEvidenceResponse, status_code=status.HTTP_201_CREATED, summary="Upload Resolution Evidence")
def upload_resolution_evidence(
    id: int,
    payload: ResolutionEvidenceCreate,
    db: Session = Depends(get_db)
):
    """Uploads photographic before-and-after resolution proof and work description."""
    return dispatch_service.upload_resolution_evidence(db, id, payload)


@router.get("/complaints/{id}/resolution-evidence", response_model=List[ResolutionEvidenceResponse], summary="Get Complaint Resolution Evidence")
def get_resolution_evidence(id: int, db: Session = Depends(get_db)):
    """Retrieves all resolution proof attachments for a complaint."""
    complaint = complaint_service.get_by_id(db, id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} not found."
        )
    return complaint.resolution_evidences or []


# ==========================================
# 5. CITIZEN FEEDBACK
# ==========================================
@router.post("/complaints/{id}/feedback", response_model=CitizenFeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit Citizen Feedback & Star Rating")
def submit_citizen_feedback(
    id: int,
    payload: CitizenFeedbackCreate,
    db: Session = Depends(get_db)
):
    """Accepts citizen satisfaction rating (1-5 stars) and feedback for a resolved complaint."""
    return dispatch_service.submit_citizen_feedback(db, id, payload)


@router.get("/complaints/{id}/feedback", response_model=Optional[CitizenFeedbackResponse], summary="Get Citizen Feedback for Complaint")
def get_citizen_feedback(id: int, db: Session = Depends(get_db)):
    """Retrieves citizen rating and feedback for a complaint."""
    complaint = complaint_service.get_by_id(db, id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} not found."
        )
    return complaint.citizen_feedback


# ==========================================
# 6. WORKFLOW & SLA ANALYTICS
# ==========================================
@router.get("/stats/workflow", summary="Get Workflow & SLA Metrics")
def get_workflow_stats(
    ward_id: Optional[int] = Query(None, description="Optional ward filter (1-8)"),
    db: Session = Depends(get_db)
):
    """Calculates comprehensive SLA compliance, crew workload distribution, and resolution turnaround times."""
    return complaint_service.get_workflow_stats(db, ward_id=ward_id)
