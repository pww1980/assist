from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean

from app.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String(36), primary_key=True, index=True)
    provider_name = Column(String(50), unique=True, nullable=False, index=True)
    enabled = Column(Boolean, default=False, nullable=False)
    config_json = Column(Text, nullable=True)  # JSON-String
    last_sync_at = Column(DateTime, nullable=True)
