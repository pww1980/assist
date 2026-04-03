from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[int] = 2
    completed: Optional[bool] = False
    external_provider: Optional[str] = None
    external_id: Optional[str] = None


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None
    external_provider: Optional[str] = None
    external_id: Optional[str] = None


class TodoResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: int
    completed: bool
    external_provider: Optional[str] = None
    external_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
