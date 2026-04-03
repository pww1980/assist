import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderResponse, ReminderUpdate
from app.websocket.manager import manager

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=List[ReminderResponse])
def list_reminders(
    sent: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    query = db.query(Reminder)
    if sent is not None:
        query = query.filter(Reminder.sent == sent)
    return query.order_by(Reminder.remind_at.asc()).all()


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    reminder = Reminder(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    await manager.broadcast(
        "reminder.created",
        ReminderResponse.model_validate(reminder).model_dump(mode="json"),
    )
    return reminder


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: str,
    payload: ReminderUpdate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    await manager.broadcast(
        "reminder.updated",
        ReminderResponse.model_validate(reminder).model_dump(mode="json"),
    )
    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: str,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    await manager.broadcast("reminder.deleted", {"id": reminder_id})
