from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean, Numeric

from app.database import Base


class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit = Column(String(30), nullable=True)
    checked = Column(Boolean, default=False, nullable=False)
    store_name = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
