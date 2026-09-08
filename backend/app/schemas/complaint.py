from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse
from app.schemas.audit import AuditLogResponse
from app.schemas.hotspot import HotspotClusterResponse
from app.schemas.crew_assignment import CrewAssignmentResponse
from app.schemas.resolution_evidence import ResolutionEvidenceResponse
from app.schemas.citizen_feedback import CitizenFeedbackResponse
from app.schemas.notification import NotificationResponse


class ComplaintBase(BaseModel):
    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None
    raw_text: str
    detected_language: Optional[str] = "en"
    translated_text: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ComplaintStatusUpdate(BaseModel):
    status: str  # RECEIVED, INVESTIGATING, IN_PROGRESS, RESOLVED, REJECTED
    changed_by: str = "Municipal Officer"
    notes: Optional[str] = None


class CitizenSubmissionResponse(BaseModel):
    tracking_id: str
    status: str
    detected_language: str
    translated_text: str
    category_id: int
    predicted_category: str
    subcategory: Optional[str] = None
    severity_score: float
    severity_level: str
    priority_score: float
    estimated_sla_hours: int
    is_duplicate: bool
    message: str
    xai_explanation: Optional[Dict[str, Any]] = None


class CitizenVoiceTranscribeResponse(BaseModel):
    detected_language: str
    raw_transcript: str
    translated_text: str
    predicted_category: str
    predicted_subcategory: Optional[str] = None
    confidence: float


class SLAMetrics(BaseModel):
    time_to_assignment_hours: Optional[float] = None
    time_to_acceptance_hours: Optional[float] = None
    time_to_start_hours: Optional[float] = None
    time_to_resolution_hours: Optional[float] = None
    total_resolution_time_hours: Optional[float] = None
    sla_target_hours: int = 48
    sla_status: str = "ON_TIME"  # ON_TIME, AT_RISK, OVERDUE


class ComplaintResponse(BaseModel):
    id: int
    tracking_id: str
    source_channel: Optional[str] = "WEB"
    external_message_id: Optional[str] = None
    external_sender_id: Optional[str] = None
    ingestion_timestamp: Optional[datetime] = None

    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None
    raw_text: str
    detected_language: str
    translated_text: str
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    category_id: int
    subcategory: Optional[str] = None
    severity_score: float
    severity_level: str
    priority_score: float
    status: str
    cluster_id: Optional[int] = None
    is_duplicate: bool
    parent_complaint_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    category: Optional[CategoryResponse] = None
    cluster: Optional[HotspotClusterResponse] = None
    audit_logs: Optional[List[AuditLogResponse]] = []
    crew_assignments: Optional[List[CrewAssignmentResponse]] = []
    resolution_evidences: Optional[List[ResolutionEvidenceResponse]] = []
    citizen_feedback: Optional[CitizenFeedbackResponse] = None
    sla_metrics: Optional[SLAMetrics] = None
    current_assignment: Optional[CrewAssignmentResponse] = None
    notifications: Optional[List[NotificationResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class ComplaintDetailResponse(ComplaintResponse):
    nearby_infrastructure: Optional[List[Dict[str, Any]]] = []
    xai_explanation: Optional[Dict[str, Any]] = None


class PaginatedComplaintResponse(BaseModel):
    items: List[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
