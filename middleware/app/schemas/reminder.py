from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReminderCreate(BaseModel):
    type: str
    target_ref: Optional[str] = None
    remind_at: datetime
    channel: Optional[str] = "telegram"
    sent: Optional[bool] = False


class ReminderUpdate(BaseModel):
    type: Optional[str] = None
    target_ref: Optional[str] = None
    remind_at: Optional[datetime] = None
    channel: Optional[str] = None
    sent: Optional[bool] = None


class ReminderResponse(BaseModel):
    id: str
    type: str
    target_ref: Optional[str] = None
    remind_at: datetime
    channel: str
    sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}
