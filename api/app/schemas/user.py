from typing import Any
from enum import Enum
from sqlalchemy.ext.mutable import MutableList
from pydantic import BaseModel, EmailStr, model_validator, Field, ConfigDict, field_validator

from app.utils.sanitizer import sanitize_string


class Role(str, Enum):
    """User roles for RBAC"""
    ADMIN = 'admin'
    MANAGER = 'manager'
    USER = 'user'


class Permission(str, Enum):
    """Permissions for RBAC"""

    # User permission
    CREATE_USER = "create:user"
    READ_USER = "read:user"
    UPDATE_USER = "update:user"
    DELETE_USER = "delete:user"

    # Admin permissions
    MANAGE_ROLES = "manage:roles"
    VIEW_METRICS = "view:metrics"


class UserBase(BaseModel):
    email: EmailStr
    username: str

    @field_validator("username", mode="before")
    @classmethod
    def sanitize_username(cls, v: str) -> str:
        return sanitize_string(v) if v else v


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str
    role: Role = Role.USER


class UserUpdate(UserBase):
    """Schema for updating a user"""
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None


class User(UserBase):
    """Schema for a user"""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
        use_enum_values=True
    )

    id: int = Field(..., alias="_id")
    role: Role = Role.USER
    permissions: list[Permission] = []
    disabled: bool = False