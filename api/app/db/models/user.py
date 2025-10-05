from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.types import JSON
from enum import Enum as PyEnum

from app.db.database import Base


class Role(str, PyEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    permissions = Column(MutableList.as_mutable(JSON), default=list, nullable=False)
    disabled = Column(Boolean, default=False)
    points = Column(Integer, default=0, nullable=False)
