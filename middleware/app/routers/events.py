import uuid
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.websocket.manager import manager

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
def list_events(
    date_filter: Optional[str] = Query(default=None, alias="date"),
    upcoming: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    query = db.query(Event)
    now = datetime.utcnow()

    if date_filter == "today":
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        query = query.filter(Event.start_time >= today_start, Event.start_time <= today_end)
    if upcoming:
        query = query.filter(Event.start_time >= now)

    return query.order_by(Event.start_time.asc()).all()


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    event = Event(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    await manager.broadcast("event.created", EventResponse.model_validate(event).model_dump(mode="json"))
    return event


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    await manager.broadcast("event.updated", EventResponse.model_validate(event).model_dump(mode="json"))
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()
    await manager.broadcast("event.deleted", {"id": event_id})
