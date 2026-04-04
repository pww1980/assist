import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.idea import Idea
from app.schemas.idea import IdeaCreate, IdeaResponse, IdeaUpdate
from app.websocket.manager import manager

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.get("", response_model=List[IdeaResponse])
def list_ideas(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    query = db.query(Idea)
    if status_filter is not None:
        query = query.filter(Idea.status == status_filter)
    return query.order_by(Idea.created_at.desc()).all()


@router.post("", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    payload: IdeaCreate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    idea = Idea(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    await manager.broadcast("idea.created", IdeaResponse.model_validate(idea).model_dump(mode="json"))
    return idea


@router.patch("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: str,
    payload: IdeaUpdate,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(idea, field, value)
    idea.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(idea)
    await manager.broadcast("idea.updated", IdeaResponse.model_validate(idea).model_dump(mode="json"))
    return idea


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: str,
    db: Session = Depends(get_db),
    auth=Depends(get_auth),
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    db.delete(idea)
    db.commit()
    await manager.broadcast("idea.deleted", {"id": idea_id})
