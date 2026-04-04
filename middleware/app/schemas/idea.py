from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class IdeaCreate(BaseModel):
    title: str
    content: Optional[str] = None
    tags: Optional[str] = None  # JSON-String
    source: Optional[str] = "telegram"
    status: Optional[str] = "active"


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None


class IdeaResponse(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    tags: Optional[str] = None
    source: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
