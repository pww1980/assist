from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, index=True)
    actor = Column(String(100), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(36), nullable=True)
    payload_json = Column(Text, nullable=True)  # JSON-String
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
