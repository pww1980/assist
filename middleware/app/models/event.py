from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(Text, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    location = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    reminder_offset = Column(Integer, nullable=True)
    external_provider = Column(String(50), nullable=True)
    external_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
