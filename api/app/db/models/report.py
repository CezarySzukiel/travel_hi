import enum
from sqlalchemy import Enum, String, Integer, Float, Text, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
from app.schemas.report import ReportType

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[ReportType] = mapped_column(
        Enum(ReportType, name="report_type"),
        nullable=False,
        index=True,
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confirmations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    denials: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True),
        server_default=text("(datetime('now'))"),
        nullable=False,
    )
