from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.models.report import Report, ReportType


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, *, type_: ReportType, description: str, lat: float, lon: float,
                     photo_path: str | None) -> Report:
        obj = Report(type=type_, description=description, latitude=lat, longitude=lon, photo_path=photo_path)
        self.session.add(obj)
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def get(self, id_: int) -> Report | None:
        res = await self.session.execute(select(Report).where(Report.id == id_))
        return res.scalar_one_or_none()

    async def list(self, *, skip: int, limit: int) -> tuple[list[Report], int]:
        q = select(Report).order_by(Report.created_at.desc()).offset(skip).limit(limit)
        res = await self.session.execute(q)
        items = list(res.scalars().all())
        total = await self.session.scalar(select(func.count()).select_from(Report))
        return items, int(total)
