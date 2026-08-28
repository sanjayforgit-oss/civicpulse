import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(50), primary_key=True, index=True)
    citizen_user_id = Column(String(100), default="anonymous_citizen", index=True)
    
    # Media & Location
    image_url = Column(String(500), nullable=True)
    sanitized_image_url = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    location_address = Column(String(300), nullable=True)
    is_vulnerable_zone = Column(Boolean, default=False) # e.g. Hospital / School / High Traffic zone
    
    # Citizen Grievance Content
    original_description = Column(Text, nullable=True)
    translated_description = Column(Text, nullable=True)
    detected_language = Column(String(20), default="en-IN")
    
    # AI Classification & Routing
    category = Column(String(50), index=True) # e.g. ROAD_POTHOLE, OPEN_MANHOLE
    category_display_name = Column(String(100))
    department = Column(String(50), index=True) # e.g. ROAD_MAINTENANCE_PWD
    department_display_name = Column(String(100))
    
    # Authenticity & Severity
    is_authentic_image = Column(Boolean, default=True)
    authenticity_probability = Column(Float, default=0.0)
    base_severity_score = Column(Integer, default=5) # 1-10
    urgency_level = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    
    # Dynamic Priority & Crowd Signals
    priority_score = Column(Float, default=50.0, index=True) # 0.0 - 100.0
    upvote_count = Column(Integer, default=1)
    duplicate_report_count = Column(Integer, default=1)
    
    # Duplicate Cluster Linking
    is_cluster_root = Column(Boolean, default=True)
    cluster_root_id = Column(String(50), ForeignKey("complaints.id"), nullable=True, index=True)
    
    # Status & Assignment
    status = Column(String(30), default="REPORTED", index=True) # REPORTED, ASSIGNED, IN_PROGRESS, RESOLVED, REOPENED_ESCALATED
    assigned_worker_id = Column(String(100), nullable=True)
    assigned_worker_name = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    officer_proof_image_url = Column(String(500), nullable=True)
    
    # Dispute & Reopen Loop
    reopen_count = Column(Integer, default=0)
    escalated_to_supervisor = Column(Boolean, default=False)
    dispute_history = Column(JSON, default=list)
    
    # Metadata & Insights
    detected_hazards = Column(JSON, default=list)
    recommended_action = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class UpvoteRecord(Base):
    __tablename__ = "upvote_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(50), ForeignKey("complaints.id"), index=True)
    user_id = Column(String(100), index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
