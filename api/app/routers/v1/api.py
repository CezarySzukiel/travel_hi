from fastapi import APIRouter

from app.routers.v1.endpoints import event
from app.routers.v1.endpoints import report
from app.routers.v1.endpoints import auth
from app.routers.v1.endpoints import user

api_router = APIRouter()

api_router.include_router(event.router, prefix="/events", tags=["Events"])
api_router.include_router(report.router, prefix="", tags=["reports"])
api_router.include_router(auth.router, prefix="/token", tags=["authentication"])
api_router.include_router(user.router, prefix="/users", tags=["users"])
