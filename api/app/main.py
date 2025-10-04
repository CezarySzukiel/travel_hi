from fastapi import FastAPI, HTTPException

from .routers.v1.api import api_router
from .db.session import db_ping

app = FastAPI(
    title="Travel Hi API", version="1.0.0", description="API for managing travels."
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db-health")
async def db_healthcheck() -> dict[str, str]:
    ok = await db_ping()
    if not ok:
        raise HTTPException(status_code=503, detail="Database unreachable")
    return {"status": "ok"}
