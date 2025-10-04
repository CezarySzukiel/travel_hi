from fastapi import HTTPException, status
from app.repositories.report import ReportRepository
from app.db.models.report import ReportType, Report


class ReportService:
    def __init__(self, repo: ReportRepository):
        self.repo = repo

    async def create(self, *, type_: ReportType, description: str, lat: float, lon: float, photo_path: str | None) -> Report:
        if len(description.strip()) < 10:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Description too short")
        return await self.repo.create(type_=type_, description=description.strip(), lat=lat, lon=lon, photo_path=photo_path)

    async def get(self, id_: int) -> Report:
        obj = await self.repo.get(id_)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return obj

    async def list(self, *, page: int, size: int) -> tuple[list[Report], int]:
        if page < 1 or size < 1 or size > 100:
            raise HTTPException(status_code=422, detail="Invalid pagination")
        skip = (page - 1) * size
        return await self.repo.list(skip=skip, limit=size)
