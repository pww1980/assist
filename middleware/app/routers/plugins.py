import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.integration import Integration
from app.models.sync_job import SyncJob

router = APIRouter(tags=["plugins"])


class IntegrationResponse(BaseModel):
    id: str
    provider_name: str
    enabled: bool
    config_json: Optional[str] = None

    model_config = {"from_attributes": True}


class IntegrationUpdate(BaseModel):
    enabled: Optional[bool] = None
    config_json: Optional[str] = None


class SyncJobResponse(BaseModel):
    id: str
    provider_name: str
    object_type: str
    object_id: str
    action: str
    status: str
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/plugins", response_model=List[IntegrationResponse])
def list_plugins(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(Integration).all()


@router.patch("/plugins/{provider_name}", response_model=IntegrationResponse)
def update_plugin(
    provider_name: str,
    payload: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    integration = db.query(Integration).filter(Integration.provider_name == provider_name).first()
    if integration is None:
        # Auto-create if not existing
        integration = Integration(
            id=str(uuid.uuid4()),
            provider_name=provider_name,
            enabled=False,
        )
        db.add(integration)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(integration, field, value)

    db.commit()
    db.refresh(integration)
    return integration


@router.get("/sync-jobs", response_model=List[SyncJobResponse])
def list_sync_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return (
        db.query(SyncJob)
        .order_by(SyncJob.created_at.desc())
        .limit(100)
        .all()
    )
