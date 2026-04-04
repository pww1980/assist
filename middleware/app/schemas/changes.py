from datetime import datetime
from typing import Any, List

from pydantic import BaseModel


class ChangeItem(BaseModel):
    id: str
    object_type: str
    action: str
    data: Any
    updated_at: datetime


class ChangesResponse(BaseModel):
    items: List[ChangeItem]
    since: datetime
