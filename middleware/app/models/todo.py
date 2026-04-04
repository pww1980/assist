from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean, SmallInteger

from app.database import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(SmallInteger, default=2, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    external_provider = Column(String(50), nullable=True)
    external_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
