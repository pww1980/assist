from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime

from app.database import Base


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON-String
    source = Column(String(20), default="telegram", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
