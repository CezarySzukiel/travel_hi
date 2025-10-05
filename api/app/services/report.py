from app.repositories.report import ReportRepository
from app.db.models.report import Report, ReportType


class ReportService:
    def __init__(self, repo: ReportRepository):
        self.repo = repo

    def create(
            self,
            *,
            type_: ReportType,
            lat: float,
            lng: float,
            name: str | None = None,
            description: str | None = None,
            photo_path: str | None = None,
    ) -> Report:
        return self.repo.create(
            type_=type_,
            lat=lat,
            lng=lng,
            name=name,
            description=description,
            photo_path=photo_path,
        )

    def get(self, id_: int) -> Report | None:
        return self.repo.get(id_)

    def list_in_radius(
            self,
            *,
            lat: float,
            lng: float,
            radius_km: float,
            skip: int,
            limit: int,
    ) -> tuple[list[Report], int]:
        return self.repo.list_in_radius(
            lat=lat, lng=lng, radius_km=radius_km, skip=skip, limit=limit
        )

    def increment_counter(self, report_id: int, counter: str) -> Report | None:
        if counter not in {"likes", "confirmations", "denials"}:
            raise ValueError(f"Invalid counter name: {counter}")

        report = self.repo.get(report_id)
        if not report:
            return None

        current = getattr(report, counter, 0)
        setattr(report, counter, current + 1)

        self.repo.session.commit()
        self.repo.session.refresh(report)
        return report
