from fastapi import APIRouter

from app.routers.v1.endpoints import event

api_router = APIRouter()

api_router.include_router(event.router, prefix="/events", tags=["Events"])
