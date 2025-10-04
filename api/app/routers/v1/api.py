from fastapi import APIRouter

from app.routers.v1.endpoints import example
from app.routers.v1.endpoints import report

api_router = APIRouter()

api_router.include_router(example.router, prefix="/example", tags=[""])
api_router.include_router(report.router, prefix="", tags=["reports"])
