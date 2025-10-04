from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()



class User(BaseModel):
    id: int
    name: str
    email: str


fake_users_db: List[User] = [
    User(id=1, name="Alice", email="alice@example.com"),
    User(id=2, name="Bob", email="bob@example.com"),
]

@router.get("/users", response_model=List[User])
async def list_users() -> List[User]:
    return fake_users_db

