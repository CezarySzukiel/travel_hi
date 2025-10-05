from fastapi import Depends, HTTPException, status
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_session
from app.core.security import oauth2_scheme
from app.schemas.token import TokenData
from app.schemas.user import Role, Permission, User

ROLE_PERMISSIONS: dict[Role, list[Permission]] = {
    Role.ADMIN: [
        # Admin has all permissions

        Permission.CREATE_USER,
        Permission.READ_USER,
        Permission.UPDATE_USER,
        Permission.DELETE_USER,
        Permission.MANAGE_ROLES,
        Permission.VIEW_METRICS
    ],
    Role.MANAGER: [
        # Manager can view users

        Permission.READ_USER,
        Permission.VIEW_METRICS
    ],
    Role.USER: [
    ]
}

_user_module = None


def get_permissions_for_role(role):
    """Get tle list pf permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, [])


async def _get_user_by_username(username: str, db: Session) -> User | None:
    """Lazily import and call the user module function"""
    global _user_module
    if _user_module is None:
        import app.repositories.user as user_module
        _user_module = user_module

    return _user_module.get_user_by_username(username, db)


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_session)):
    """Get the current user from a JWT token."""
    credential_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("name")

        if username is None:
            raise credential_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credential_exception

    user = await _get_user_by_username(token_data.username, db)
    if user is None:
        raise credential_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.disabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user


def has_permission(user: User, required_permission: Permission) -> bool:
    """Check if a user has a specific permission."""
    role_permission = ROLE_PERMISSIONS.get(user.role) if user.role else []
    all_permissions = set(role_permission + user.permissions)

    return required_permission in all_permissions


def require_permission(permission: Permission):
    async def permission_dependencies(current_user: User = Depends(get_current_active_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user

    return permission_dependencies
