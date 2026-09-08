from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.notification import NotificationResponse


class WhatsAppLocation(BaseModel):
    latitude: float
    longitude: float


class WhatsAppWebhookPayload(BaseModel):
    message_id: str = Field(..., description="Unique WhatsApp message ID, e.g., WA-10001")
    from_number: str = Field(..., alias="from", description="Citizen phone number, e.g., +919876543210")
    type: str = Field("text", description="Message type: text, location, image")
    text: str = Field(..., min_length=1, description="Citizen grievance message text")
    location: Optional[WhatsAppLocation] = Field(None, description="Optional GPS coordinates sent via WhatsApp")
    image_url: Optional[str] = Field(None, description="Optional image attachment URL")
    timestamp: Optional[str] = Field(None, description="Message timestamp")

    model_config = ConfigDict(populate_by_name=True)


class SMSWebhookPayload(BaseModel):
    message_id: str = Field(..., description="Unique SMS message ID, e.g., SMS-10001")
    from_number: str = Field(..., alias="from", description="Citizen phone number, e.g., +919876543210")
    text: str = Field(..., min_length=1, description="SMS text grievance")

    model_config = ConfigDict(populate_by_name=True)


class GenericWebhookPayload(BaseModel):
    external_id: str = Field(..., min_length=1, description="External system message/ticket ID")
    channel: str = Field("WEBHOOK", description="Ingestion channel: WEB, WHATSAPP, SMS, WEBHOOK")
    citizen: Optional[str] = Field(None, description="Citizen full name")
    contact: Optional[str] = Field(None, description="Citizen phone or email identifier")
    message: str = Field(..., min_length=1, description="Complaint description")
    latitude: Optional[float] = Field(None, description="Optional latitude coordinate")
    longitude: Optional[float] = Field(None, description="Optional longitude coordinate")
    address: Optional[str] = Field(None, description="Optional textual address")
    attachments: Optional[List[str]] = Field(default=[], description="Optional attachment URLs")


class NormalizedComplaintPayload(BaseModel):
    source_channel: str = "WEB"  # WEB, WHATSAPP, SMS, WEBHOOK
    external_message_id: Optional[str] = None
    citizen_identifier: Optional[str] = None  # e.g., "+919876543210"
    citizen_name: Optional[str] = None
    raw_message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    attachments: Optional[List[str]] = []
    received_at: Optional[datetime] = None


class OmnichannelIngestionResponse(BaseModel):
    complaint_id: int
    tracking_id: str
    channel: str
    external_message_id: Optional[str] = None
    detected_language: str
    translated_text: str
    category_id: int
    category: str
    subcategory: Optional[str] = None
    severity_level: str
    severity_score: float
    priority_score: float
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    status: str
    message: str
    notifications_sent: List[NotificationResponse] = []
    xai_explanation: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
