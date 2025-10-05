from math import radians, sin, cos, sqrt, atan2
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db.models.report import Report, ReportType


class ReportRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(
            self,
            *,
            type_: ReportType,
            lat: float,
            lng: float,
            photo_path: str | None,
            name: str | None = None,
            description: str | None = None,
    ) -> Report:
        obj = Report(
            type=type_,
            latitude=lat,
            longitude=lng,
            photo_path=photo_path,
            name=name,
            description=description,
            likes=0,
            confirmations=0,
            denials=0,
        )
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    def get(self, id_: int) -> Report | None:
        res = self.session.execute(select(Report).where(Report.id == id_))
        return res.scalar_one_or_none()

    def list_(self, *, skip: int, limit: int) -> tuple[list[Report], int]:
        q = select(Report).order_by(Report.created_at.desc()).offset(skip).limit(limit)
        res = self.session.execute(q)
        items = list(res.scalars().all())
        total = self.session.scalar(select(func.count()).select_from(Report))
        return items, int(total)

    def list_in_radius(
            self, *, lat: float, lng: float, radius_km: float, skip: int, limit: int
    ) -> tuple[list[Report], int]:
        q = select(Report)
        reports = list(self.session.execute(q).scalars().all())

        def haversine(lat1, lng1, lat2, lng2):
            R = 6371  # promień Ziemi w km
            dlat = radians(lat2 - lat1)
            dlng = radians(lng2 - lng1)
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c

        filtered = [
            r for r in reports
            if haversine(lat, lng, r.latitude, r.longitude) <= radius_km
        ]

        total = len(filtered)
        return filtered[skip: skip + limit], total

    def increment_counter(self, id_: int, field: str) -> Report | None:
        """
        Inkrementuje pole 'likes', 'confirmations' lub 'denials' dla danego zgłoszenia.
        """
        report = self.get(id_)
        if not report:
            return None

        if field not in {"likes", "confirmations", "denials"}:
            raise ValueError(f"Invalid counter field: {field}")

        current_value = getattr(report, field, 0)
        setattr(report, field, current_value + 1)
        self.session.commit()
        self.session.refresh(report)
        return report
