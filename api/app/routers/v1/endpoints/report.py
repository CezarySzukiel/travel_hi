from fastapi import APIRouter, Depends, UploadFile, File, Form, Request
from pydantic import ValidationError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.repositories.report import ReportRepository
from app.services.report import ReportService
from app.schemas.report import ReportCreate, ReportRead, ReportList, ReportType, Location
from app.utils.images import validate_and_store_image

router = APIRouter(tags=["reports"])


def get_service(session: AsyncSession = Depends(get_db_session)) -> ReportService:
    return ReportService(ReportRepository(session))


@router.post("/reports", response_model=ReportRead, status_code=201)
async def create_report(
        request: Request,
        type: ReportType = Form(...),
        description: str = Form(...),
        lat: float = Form(...),
        lon: float = Form(...),
        photo: UploadFile | None = File(default=None),
        svc: ReportService = Depends(get_service),
):
    try:
        loc = Location(lat=lat, lon=lon)
    except ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail="Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180."
        )
    if not photo or not getattr(photo, "filename", None):
        photo_name = None
    else:
        photo_name = validate_and_store_image(photo)
    obj = await svc.create(type_=type, description=description, lat=lat, lon=lon, photo_path=photo_name)
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)


@router.get("/reports/{report_id}", response_model=ReportRead)
async def get_report(report_id: int, request: Request, svc: ReportService = Depends(get_service)):
    obj = await svc.get(report_id)
    base = str(request.base_url).rstrip("/")
    return ReportRead.from_orm_with_photo(obj, base_url=base)


@router.get("/reports", response_model=ReportList)
async def list_reports(page: int = 1, size: int = 20, request: Request = None,
                       svc: ReportService = Depends(get_service)):
    items, total = await svc.list(page=page, size=size)
    base = str(request.base_url).rstrip("/") if request else None
    data = [ReportRead.from_orm_with_photo(i, base_url=base) for i in items]
    return ReportList(items=data, total=total)
