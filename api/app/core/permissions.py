from fastapi import HTTPException, Path, status
from fastapi.params import Depends
from sqlalchemy.sql.annotation import Annotated

from app.core.auth import get_token_payload


class PermissionDenied(HTTPException):
    def __init__(self, detail="Permission denied!"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def is_admin(user: Annotated[dict, Depends(get_token_payload)]) -> dict:
    if "admin" not in user.roles:
        raise PermissionDenied("Admin only endpoint")
    return user


def is_owner(user: Annotated[dict, Depends(get_token_payload)], resume_user_id: Annotated[int, Path(...)]) -> dict:
    if "admin" in user.roles:
        return user
    elif "user" in user.role and user.id == resume_user_id:
        return user
    else:
        raise PermissionDenied("Not your resource")
