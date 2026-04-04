from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean

from app.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String(36), primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    target_ref = Column(String(36), nullable=True)
    remind_at = Column(DateTime, nullable=False)
    channel = Column(String(30), default="telegram", nullable=False)
    sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
