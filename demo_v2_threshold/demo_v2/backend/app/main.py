"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.settings import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup/shutdown hooks."""
    # Bootstrap catalog formula parsing so DE-created metrics have correct
    # required_measures in the in-memory map from the moment the server starts.
    from app.services.qpm_service import _bootstrap_catalog_formulas
    from database.database import SessionLocal
    _bootstrap_catalog_formulas(SessionLocal)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
