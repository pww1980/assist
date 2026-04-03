from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime

from app.database import Base


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(String(36), primary_key=True, index=True)
    provider_name = Column(String(50), nullable=False)
    object_type = Column(String(50), nullable=False)
    object_id = Column(String(36), nullable=False)
    action = Column(String(20), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
