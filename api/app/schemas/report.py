from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class ReportType(str, Enum):
    # Ruch drogowy
    ACCIDENT = "accident"
    TRAFFIC_JAM = "traffic_jam"
    ROADBLOCK = "roadblock"
    ROADWORK = "roadwork"
    SLIPPERY_ROAD = "slippery_road"
    OBJECT_ON_ROAD = "object_on_road"
    # Transport publiczny
    DELAY = "delay"

    # Bezpieczeństwo i awarie
    POLICE = "police"
    OTHER = "other"


class Location(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ReportCreate(BaseModel):
    type: ReportType
    location: Location
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=2000)
    photo_url: str | None = None


class ReportRead(BaseModel):
    """
    Schemat odpowiedzi zwracanej użytkownikowi (np. GET /reports).
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: ReportType
    name: str | None = None
    description: str | None = None
    location: Location
    photo_url: str | None = None
    likes: int
    confirmations: int
    denials: int
    created_at: str

    @classmethod
    def from_orm_with_photo(cls, obj, base_url: str | None = None):
        loc = Location(lat=obj.latitude, lng=obj.longitude)
        photo_url = None
        if obj.photo_path and base_url:
            photo_url = f"{base_url}/files/{obj.photo_path.split('/')[-1]}"

        return cls(
            id=obj.id,
            type=obj.type,
            name=obj.name,
            description=obj.description,
            location=loc,
            photo_url=photo_url,
            likes=obj.likes,
            confirmations=obj.confirmations,
            denials=obj.denials,
            created_at=obj.created_at.isoformat(),
        )


class ReportList(BaseModel):
    items: list[ReportRead]
    total: int


class LocationFilter(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(1, gt=0, le=50, description="Search radius in km (default 1 km, max 50 km)")


class WSMessage(BaseModel):
    user: str = Field(..., description="Username or sender ID")
    message: str = Field(..., description="User message text")
    lat: float = Field(..., ge=-90, le=90, description="User latitude")
    lng: float = Field(..., ge=-180, le=180, description="User longitude")
    likes: int = Field(0, ge=0, description="Number of likes")
    timestamp: str = Field(..., description="ISO timestamp string")
