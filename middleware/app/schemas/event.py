from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    reminder_offset: Optional[int] = None
    external_provider: Optional[str] = None
    external_id: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    reminder_offset: Optional[int] = None
    external_provider: Optional[str] = None
    external_id: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    reminder_offset: Optional[int] = None
    external_provider: Optional[str] = None
    external_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
