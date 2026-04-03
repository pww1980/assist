from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ShoppingItemCreate(BaseModel):
    title: str
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    checked: Optional[bool] = False
    store_name: Optional[str] = None
    price: Optional[Decimal] = None


class ShoppingItemUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    checked: Optional[bool] = None
    store_name: Optional[str] = None
    price: Optional[Decimal] = None


class ShoppingItemResponse(BaseModel):
    id: str
    title: str
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    checked: bool
    store_name: Optional[str] = None
    price: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
