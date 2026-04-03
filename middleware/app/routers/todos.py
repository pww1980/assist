import uuid
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoResponse, TodoUpdate
from app.websocket.manager import manager

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=List[TodoResponse])
def list_todos(
    completed: Optional[bool] = Query(default=None),
    priority: Optional[int] = Query(default=None),
    due_today: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    query = db.query(Todo)
    if completed is not None:
        query = query.filter(Todo.completed == completed)
    if priority is not None:
        query = query.filter(Todo.priority == priority)
    if due_today:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        query = query.filter(Todo.due_date >= today_start, Todo.due_date <= today_end)
    return query.order_by(Todo.created_at.desc()).all()


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    payload: TodoCreate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    todo = Todo(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    await manager.broadcast("todo.created", TodoResponse.model_validate(todo).model_dump(mode="json"))
    return todo


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: str,
    payload: TodoUpdate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(todo, field, value)
    todo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(todo)
    await manager.broadcast("todo.updated", TodoResponse.model_validate(todo).model_dump(mode="json"))
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: str,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    db.delete(todo)
    db.commit()
    await manager.broadcast("todo.deleted", {"id": todo_id})
