from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.auth.jwt import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_auth(
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    x_sync_token: Optional[str] = Header(default=None, alias="X-Sync-Token"),
    db: Session = Depends(get_db),
):
    """
    Accepts either:
      - A valid JWT Bearer access token (Dashboard / normal users)
      - A valid X-Sync-Token header matching SYNC_SERVICE_TOKEN (bridge script)
    """
    # Try sync token first (header-based, no DB lookup needed)
    if x_sync_token is not None:
        if x_sync_token == settings.SYNC_SERVICE_TOKEN:
            return {"auth_type": "sync"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sync service token",
        )

    # Fall back to JWT bearer token
    if bearer_token is not None:
        from app.models.user import User

        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        payload = verify_token(bearer_token)  # raises 401 on invalid
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
        return {"auth_type": "user", "user": user}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_sync_auth(
    x_sync_token: Optional[str] = Header(default=None, alias="X-Sync-Token"),
):
    """Exclusively for sync-service endpoints."""
    if x_sync_token is None or x_sync_token != settings.SYNC_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing sync service token",
        )
    return True
