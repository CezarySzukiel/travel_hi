from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models.

    This class serves as the foundation for defining ORM models in the
    application using the SQLAlchemy 2.0 style. All ORM model classes
    should inherit from `Base` to ensure they are registered with
    SQLAlchemy's declarative system and share the same `MetaData` object.

    Examples:
        Define a new ORM model:

            class User(Base):
                __tablename__ = "users"

                id: Mapped[int] = mapped_column(primary_key=True)
                name: Mapped[str] = mapped_column(String(50))

    Notes:
        - Using `DeclarativeBase` (introduced in SQLAlchemy 2.0) is
          preferred over the legacy `declarative_base()` factory.
        - Allows adding common mixins, methods, or configuration for all models.
    """

    pass
