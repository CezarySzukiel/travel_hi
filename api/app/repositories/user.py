from sqlalchemy.orm import Session
from pydantic import EmailStr

from app.core.rbac import get_permissions_for_role
from app.core.security import get_password_hash
from app.db.models.user import User, Role
from app.schemas.user import UserCreate, UserUpdate, Permission


def get_user_by_username(username: str, db: Session) -> User | None:
    """Get a user by username from SQL (sync)."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(email: EmailStr, db: Session) -> User | None:
    """Get a user by email from SQL (sync)."""
    return db.query(User).filter(User.email == email).first()


def create_user(user: UserCreate, db: Session) -> User:
    """Create a new user in SQLite."""
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_dict["password"])
    user_dict.pop("password", None)

    role = user_dict.get("role", Role.USER)
    permissions = get_permissions_for_role(
        role)  # zwraca zawsze listę i błąd zapisu, ponieważ alchemy nie wie jak zapisać listę
    user_dict["permissions"] = permissions
    user_dict["disabled"] = False

    new_user = User(**user_dict)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def get_user_by_id(user_id: int, db: Session) -> User | None:
    """Get a user by id from SQL (sync)."""
    return db.query(User).filter(User.id == user_id).first()


def update_user(user_id: int, user_update: UserUpdate, db: Session) -> User | None:
    """Update a user in SQLite"""
    user = get_user_by_id(user_id, db)
    if not user:
        return None

    if user_update.username is not None and user_update.username != user.username:
        existing_user = get_user_by_username(user_update.username, db)
        if existing_user and existing_user.id != user_id:
            raise ValueError("Username already exists")
        user.username = user_update.username

    if user_update.email is not None and user_update.email != user.email:
        existing_email = get_user_by_email(user_update.email, db)
        if existing_email and existing_email.id != user_id:
            raise ValueError("Email already exists.")
        user.email = user_update.email

    if user_update.password is not None:
        user.password_hash = get_password_hash(user_update.password)

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    """Get all users (for admin purposes)"""
    return db.query(User).offset(skip).limit(limit).all()


def update_user_role(user_id: int, role: Role, db: Session) -> User | None:
    """Update a user's role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    permissions = get_permissions_for_role(role)

    user.role = role
    user.permissions = permissions
    db.commit()
    db.refresh(user)

    return user


def update_user_status(user_id: int, disabled: bool, db: Session) -> bool:
    """Update a user's disabled status"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    user.disabled = disabled
    db.commit()
    return True


def add_user_permission(user_id: int, permission: Permission, db: Session) -> User | None:
    """Add a permission to a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    current_permissions = user.permissions or []
    if permission not in current_permissions:
        current_permissions.append(permission)
        user.permissions = current_permissions
        db.commit()
        db.refresh(user)

    return user


def remove_user_permission(user_id: int, permission: Permission, db: Session) -> User | None:
    """Remove a permission from a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    current_permissions = user.permissions or []
    perm_value = permission.value
    if permission in current_permissions:
        current_permissions.remove(perm_value)
        user.permissions = list(current_permissions)
        db.commit()
        db.refresh(user)

    return user


def delete_user(user_id: int, db: Session) -> bool:
    """Delete a user and their widgets"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    if user.role == Role.ADMIN:
        admin_count = db.query(User).filter(User.role == Role.ADMIN).count()
        if admin_count <= 1:
            return False

    db.delete(user)
    db.commit()

    return True