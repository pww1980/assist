from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_sync_auth
from app.database import get_db
from app.models.event import Event
from app.models.idea import Idea
from app.models.reminder import Reminder
from app.models.shopping_item import ShoppingItem
from app.models.todo import Todo
from app.schemas.changes import ChangeItem, ChangesResponse
from app.schemas.event import EventResponse
from app.schemas.idea import IdeaResponse
from app.schemas.reminder import ReminderResponse
from app.schemas.shopping import ShoppingItemResponse
from app.schemas.todo import TodoResponse

router = APIRouter(prefix="/changes", tags=["changes"])


@router.get("", response_model=ChangesResponse)
def get_changes(
    since: datetime = Query(..., description="ISO-8601 timestamp to fetch changes since"),
    db: Session = Depends(get_db),
    auth=Depends(get_sync_auth),
):
    items: List[ChangeItem] = []

    # Todos
    todos = db.query(Todo).filter(Todo.updated_at >= since).all()
    for todo in todos:
        items.append(
            ChangeItem(
                id=todo.id,
                object_type="todo",
                action="upsert",
                data=TodoResponse.model_validate(todo).model_dump(mode="json"),
                updated_at=todo.updated_at,
            )
        )

    # Events
    events = db.query(Event).filter(Event.updated_at >= since).all()
    for event in events:
        items.append(
            ChangeItem(
                id=event.id,
                object_type="event",
                action="upsert",
                data=EventResponse.model_validate(event).model_dump(mode="json"),
                updated_at=event.updated_at,
            )
        )

    # Ideas
    ideas = db.query(Idea).filter(Idea.updated_at >= since).all()
    for idea in ideas:
        items.append(
            ChangeItem(
                id=idea.id,
                object_type="idea",
                action="upsert",
                data=IdeaResponse.model_validate(idea).model_dump(mode="json"),
                updated_at=idea.updated_at,
            )
        )

    # Shopping items
    shopping_items = db.query(ShoppingItem).filter(ShoppingItem.updated_at >= since).all()
    for shopping_item in shopping_items:
        items.append(
            ChangeItem(
                id=shopping_item.id,
                object_type="shopping_item",
                action="upsert",
                data=ShoppingItemResponse.model_validate(shopping_item).model_dump(mode="json"),
                updated_at=shopping_item.updated_at,
            )
        )

    # Reminders (no updated_at, use created_at as proxy)
    reminders = db.query(Reminder).filter(Reminder.created_at >= since).all()
    for reminder in reminders:
        items.append(
            ChangeItem(
                id=reminder.id,
                object_type="reminder",
                action="upsert",
                data=ReminderResponse.model_validate(reminder).model_dump(mode="json"),
                updated_at=reminder.created_at,
            )
        )

    # Sort all items by updated_at ascending
    items.sort(key=lambda x: x.updated_at)

    return ChangesResponse(items=items, since=since)
