from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.routers import auth, changes, events, ideas, plugins, reminders, shopping, todos
from app.websocket.router import router as ws_router


def create_admin_if_missing() -> None:
    from app.routers.auth import ensure_admin_user

    db = SessionLocal()
    try:
        ensure_admin_user(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_admin_if_missing()
    yield


app = FastAPI(
    title="Assistant API",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router
app.include_router(auth.router, prefix="/api")

# Resource routers
app.include_router(todos.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(ideas.router, prefix="/api")
app.include_router(shopping.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")

# Changes router (sync service)
app.include_router(changes.router, prefix="/api")

# Plugin / sync-job management
app.include_router(plugins.router, prefix="/api")

# WebSocket
app.include_router(ws_router)
