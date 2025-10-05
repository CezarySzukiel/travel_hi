from datetime import datetime
import asyncio
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    Request,
    HTTPException,
    Query,
)
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.db.database import get_session
from app.repositories.report import ReportRepository
from app.services.report import ReportService
from app.schemas.report import ReportRead, ReportType, Location, ReportList
from app.utils.images import validate_and_store_image
from app.schemas.traffic import TrafficReport
from app.utils.llm import assess_disruption
from app.services.ws_manager import manager
from app.utils.moderation import moderate_text

router = APIRouter()


def get_service(session: Session = Depends(get_session)) -> ReportService:
    return ReportService(ReportRepository(session))


@router.post("/incidents", response_model=ReportRead, status_code=201)
async def create_report(
        request: Request,
        type: ReportType = Form(...),
        lat: float = Form(...),
        lng: float = Form(...),
        name: str | None = Form(None, description="Optional report title/name"),
        description: str | None = Form(None, description="Optional description"),
        photo: UploadFile | None = File(default=None),
        svc: ReportService = Depends(get_service),
):
    try:
        Location(lat=lat, lng=lng)
    except ValidationError:
        raise HTTPException(
            status_code=422,
            detail="Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.",
        )


    if description:
        moderate_description = moderate_text(description)
        if moderate_description is False:
            raise HTTPException(
                status_code=400,
                detail="Description contains inappropriate content.",
            )

    if name:
        moderate_name = moderate_text(name)
        if moderate_name is False:
            raise HTTPException(
                status_code=400,
                detail="Name contains inappropriate content.",
            )

    photo_name = validate_and_store_image(photo) if photo and photo.filename else None

    obj = svc.create(
        type_=type,
        lat=lat,
        lng=lng,
        name=name,
        description=description,
        photo_path=photo_name,
    )

    base = str(request.base_url).rstrip("/")
    result = ReportRead.from_orm_with_photo(obj, base_url=base)

    broadcast_data = {
        "user": "Anonim",
        "message": description or name or "Nowe zgłoszenie",
        "lat": lat,
        "lng": lng,
        "likes": obj.likes,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    asyncio.create_task(manager.broadcast(broadcast_data))

    return result


@router.get("/incidents/{incident_id}", response_model=ReportRead, status_code=200)
def get_report(
        incident_id: int,
        request: Request,
        svc: ReportService = Depends(get_service),
):
    obj = svc.get(incident_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Report with id={incident_id} not found")
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)


@router.get("/incidents", response_model=ReportList, status_code=200)
def list_reports(
        request: Request,
        lat: float = Query(0, ge=-90, le=90, description="User latitude"),
        lng: float = Query(0, ge=-180, le=180, description="User longitude"),
        radius: float = Query(5.0, gt=0, le=50, description="Search radius in kilometers (default 5 km)"),
        skip: int = Query(0, ge=0, description="Number of items to skip"),
        limit: int = Query(50, le=200, description="Max number of items to return"),
        svc: ReportService = Depends(get_service),
):
    items, total = svc.list_in_radius(lat=lat, lng=lng, radius_km=radius, skip=skip, limit=limit)
    base = str(request.base_url).rstrip("/")
    reports = [ReportRead.from_orm_with_photo(obj, base_url=base) for obj in items]
    return ReportList(items=reports, total=total)


@router.post("/incidents/{incident_id}/like", response_model=ReportRead)
def like_report(
        incident_id: int,
        request: Request,
        svc: ReportService = Depends(get_service),
):
    obj = svc.increment_counter(incident_id, "likes")
    if not obj:
        raise HTTPException(status_code=404, detail=f"Report with id={incident_id} not found")
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)


@router.post("/incidents/{incident_id}/confirm", response_model=ReportRead)
def confirm_report(
        incident_id: int,
        request: Request,
        svc: ReportService = Depends(get_service),
):
    obj = svc.increment_counter(incident_id, "confirmations")
    if not obj:
        raise HTTPException(status_code=404, detail=f"Report with id={incident_id} not found")
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)


@router.post("/incidents/{incident_id}/deny", response_model=ReportRead)
def deny_report(
        incident_id: int,
        request: Request,
        svc: ReportService = Depends(get_service),
):
    obj = svc.increment_counter(incident_id, "denials")
    if not obj:
        raise HTTPException(status_code=404, detail=f"Report with id={incident_id} not found")
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)
