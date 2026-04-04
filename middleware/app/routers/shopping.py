import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.shopping_item import ShoppingItem
from app.schemas.shopping import ShoppingItemCreate, ShoppingItemResponse, ShoppingItemUpdate
from app.websocket.manager import manager

router = APIRouter(prefix="/shopping", tags=["shopping"])


@router.get("", response_model=List[ShoppingItemResponse])
def list_shopping_items(
    checked: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    query = db.query(ShoppingItem)
    if checked is not None:
        query = query.filter(ShoppingItem.checked == checked)
    return query.order_by(ShoppingItem.created_at.desc()).all()


@router.post("", response_model=ShoppingItemResponse, status_code=status.HTTP_201_CREATED)
async def create_shopping_item(
    payload: ShoppingItemCreate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    item = ShoppingItem(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    await manager.broadcast(
        "shopping.created",
        ShoppingItemResponse.model_validate(item).model_dump(mode="json"),
    )
    return item


@router.patch("/{item_id}", response_model=ShoppingItemResponse)
async def update_shopping_item(
    item_id: str,
    payload: ShoppingItemUpdate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    await manager.broadcast(
        "shopping.updated",
        ShoppingItemResponse.model_validate(item).model_dump(mode="json"),
    )
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_item(
    item_id: str,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping item not found")
    db.delete(item)
    db.commit()
    await manager.broadcast("shopping.deleted", {"id": item_id})
