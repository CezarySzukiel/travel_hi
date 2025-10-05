from fastapi import APIRouter, HTTPException, status, Path
from sqlalchemy.orm import Session
from fastapi import Depends, Query
from typing import Annotated

from app.db.database import get_session
from app.core.rbac import get_current_active_user, has_permission, require_permission
from app.repositories.user import get_user_by_username, get_user_by_email, create_user, update_user, get_all_users, \
    update_user_role, get_user_by_id, update_user_status, add_user_permission, remove_user_permission, delete_user
from app.schemas.user import User, UserCreate, UserUpdate, Permission, Role

router = APIRouter()


@router.post(
    "/user",
    response_model=User
)
async def register_user(user: UserCreate, db: Session = Depends(get_session)) -> User:
    """Register a new user."""
    existing_user = get_user_by_username(user.username, db)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )

    existing_email = get_user_by_email(user.email, db)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists."
        )

    return create_user(user, db)


@router.get(
    "/me",
    response_model=User
)
async def read_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current user."""
    return current_user


@router.patch("/{user_id}", response_model=User)
async def update_user_details(
        user_update: UserUpdate,
        user_id: str = Path(..., title="The ID of the user to update."),
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_session)
):
    if str(current_user.id) != user_id and not has_permission(current_user, Permission.UPDATE_USER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this user"
        )

    try:
        updated_user = update_user(int(user_id), user_update, db)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/",
    response_model=list[User],
    dependencies=[Depends(require_permission(Permission.READ_USER))]
)
async def read_users(
        skip: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=100)] = 10,
        db: Session = Depends(get_session)
):
    """Get all users (requires READ_USER permission)"""
    return get_all_users(db, skip, limit)


@router.patch(
    "/{user_id}/role",
    response_model=User,
    dependencies=[Depends(require_permission(Permission.MANAGE_ROLES))]
)
async def update_role(
        role: Role,
        user_id: str = Path(..., title="The ID of the user to update."),
        db: Session = Depends(get_session)
):
    user = update_user_role(int(user_id), role, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.get(
    "/{user_id}",
    response_model=User,
    dependencies=[Depends(require_permission(Permission.READ_USER))]

)
async def read_user(
        user_id: str = Path(..., title="The ID of the user to get."),
        db: Session = Depends(get_session)
):
    """Get a specific user by id (requires READ_USER permission)"""
    user = get_user_by_id(int(user_id), db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@router.patch(
    "/{user_id}/status",
    response_model=User,
    dependencies=[Depends(require_permission(Permission.MANAGE_ROLES))]
)
async def update_user_status_endpoint(
        disabled: bool,
        user_id: str = Path(..., title="The ID of the user to update."),
        db: Session = Depends(get_session)
):
    updated = update_user_status(int(user_id), disabled, db)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user = get_user_by_id(int(user_id), db)
    return user


@router.post(
    "/{user_id}/permissions/add",
    response_model=User,
    dependencies=[Depends(require_permission(Permission.MANAGE_ROLES))]
)
async def add_permission(
        permission: Permission,
        user_id: str = Path(..., title="The ID of the user to update."),
        db: Session = Depends(get_session)
):
    user = add_user_permission(user_id, permission, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.post(
    "/{user_id}/permissions/remove",
    response_model=User,
    dependencies=[Depends(require_permission(Permission.MANAGE_ROLES))]
)
async def remove_permission(
        permission: Permission,
        user_id: str = Path(..., title="The ID of the user to update."),
        db: Session = Depends(get_session)
):
    user = remove_user_permission(int(user_id), permission, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_endpoint(
        user_id: str = Path(..., title="The ID of the user to delete."),
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_session)
):
    if str(current_user.id) != user_id and not has_permission(current_user, Permission.UPDATE_USER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this user"
        )
    deleted = delete_user(int(user_id), db)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return None
