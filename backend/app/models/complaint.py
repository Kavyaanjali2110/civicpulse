from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String(20), unique=True, index=True, nullable=False)
    
    # Omnichannel metadata
    source_channel = Column(String(20), default="WEB", nullable=False, index=True)  # WEB, WHATSAPP, SMS, WEBHOOK
    external_message_id = Column(String(100), unique=True, nullable=True, index=True)
    external_sender_id = Column(String(100), nullable=True, index=True)
    ingestion_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    citizen_name = Column(String(100), nullable=True)
    citizen_contact = Column(String(50), nullable=True)
    
    raw_text = Column(Text, nullable=False)
    detected_language = Column(String(10), default="en", nullable=False)
    translated_text = Column(Text, nullable=False)
    
    audio_url = Column(String(255), nullable=True)
    image_url = Column(String(255), nullable=True)
    
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    address = Column(String(255), nullable=True)
    ward_id = Column(Integer, nullable=True, index=True)
    ward_name = Column(String(80), nullable=True)
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)
    
    severity_score = Column(Float, default=0.5, nullable=False)  # 0.0 to 1.0
    severity_level = Column(String(20), default="MEDIUM", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    priority_score = Column(Float, default=50.0, nullable=False, index=True)  # 0.0 to 100.0
    
    status = Column(String(30), default="RECEIVED", nullable=False, index=True)  # RECEIVED, INVESTIGATING, IN_PROGRESS, RESOLVED, REJECTED
    
    cluster_id = Column(Integer, ForeignKey("hotspot_clusters.id"), nullable=True, index=True)
    
    is_duplicate = Column(Boolean, default=False, nullable=False)
    parent_complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    category = relationship("Category", back_populates="complaints")
    cluster = relationship("HotspotCluster", back_populates="complaints")
    audit_logs = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan", order_by="AuditLog.created_at.asc()")
    crew_assignments = relationship("CrewAssignment", back_populates="complaint", cascade="all, delete-orphan", order_by="CrewAssignment.assigned_at.desc()")
    resolution_evidences = relationship("ResolutionEvidence", back_populates="complaint", cascade="all, delete-orphan", order_by="ResolutionEvidence.uploaded_at.desc()")
    citizen_feedback = relationship("CitizenFeedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="complaint", cascade="all, delete-orphan", order_by="Notification.created_at.asc()")

    def __repr__(self):
        return f"<Complaint(tracking_id='{self.tracking_id}', channel='{self.source_channel}', status='{self.status}', priority={self.priority_score})>"
