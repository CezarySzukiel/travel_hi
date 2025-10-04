from fastapi import Depends, FastAPI

from .routers.v1.api import api_router
from sqlalchemy.orm import Session
from .db.database import Base, engine, get_session

app = FastAPI(
    title="Travel Hi API", version="1.0.0", description="API for managing travels."
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/events")
def list_events(session: Session = Depends(get_session)):
    # przykładowe zapytanie:
    # rows = session.query(Event).limit(50).all()
    return []