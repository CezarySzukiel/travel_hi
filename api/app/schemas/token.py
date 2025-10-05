from pydantic import BaseModel, Field


class Token(BaseModel):
    """Schema for the token response"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for the token data"""
    username: str | None = None


class TokenRequest(BaseModel):
    """Schema for the token request via JSON"""
    username: str
    password: str


class WSMessage(BaseModel):
    user: str = Field(..., description="Username or sender ID")
    message: str = Field(..., description="User message text")
    lat: float = Field(..., ge=-90, le=90, description="User latitude")
    lng: float = Field(..., ge=-180, le=180, description="User longitude")
    likes: int = Field(0, ge=0, description="Number of likes")
    timestamp: str = Field(..., description="ISO timestamp string")
