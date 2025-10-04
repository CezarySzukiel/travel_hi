"""Asynchronous SQLAlchemy configuration for the FastAPI application.

Sets up a shared `AsyncEngine`, an `async_sessionmaker` factory,
and provides a FastAPI dependency `get_db_session()` for database access.
Also includes database health check utilities (`db_ping`, `wait_for_db_ready`)
and a safe engine disposal function (`dispose_engine`).
"""

import asyncio
import logging
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger("app.db")


def _build_engine() -> AsyncEngine:
    """Create and configure the global AsyncEngine instance.

    Uses PostgreSQL with the asyncpg driver. Configures connection pooling,
    statement caching, timeouts, and server-side settings such as
    `statement_timeout`.

    Returns:
        AsyncEngine: Configured SQLAlchemy asynchronous engine.
    """
    connect_args: dict[str, int] = {
        "statement_cache_size": 0,
        "timeout": settings.DB_STATEMENT_TIMEOUT_S,
    }

    server_settings: dict[str, str] = {
        "application_name": "offers-scraper",
        "statement_timeout": str(settings.DB_STATEMENT_TIMEOUT_S * 1000),
    }

    engine_ = create_async_engine(
        url=str(settings.DATABASE_URL),
        echo=settings.DB_ECHO,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=settings.DB_PRE_PING,
        connect_args={"server_settings": server_settings, **connect_args},
    )
    return engine_


#: Global async SQLAlchemy engine.
engine: AsyncEngine = _build_engine()

#: Global async session factory bound to the configured engine.
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession]:
    """Provide a new database session for FastAPI dependency injection.

    Yields:
        AsyncSession: A SQLAlchemy asynchronous session instance.
    """
    session: AsyncSession = AsyncSessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def db_ping(timeout_s: int = 5) -> bool:
    """Perform a lightweight database health check.

    Executes `SELECT 1` within the given timeout to ensure the database
    connection is alive.
    """
    try:
        async with engine.connect() as conn:
            await asyncio.wait_for(conn.execute(text("SELECT 1")), timeout=timeout_s)
        return True
    except Exception as exc:
        logger.warning("DB ping failed: %r", exc)
        return False


async def wait_for_db_ready() -> None:
    """Wait until the database becomes available or raise an error.

    Retries the health check until success or the maximum number of retries
    is reached. Implements exponential backoff between attempts.

    Raises:
        RuntimeError: If the database is not reachable after all retries.
    """
    retries: int = settings.DB_CONNECT_RETRIES
    backoff: float = settings.DB_CONNECT_BACKOFF_S
    for attempt in range(1, retries + 1):
        if await db_ping():
            logger.info("Database is ready.")
            return
        logger.warning(
            "Database not ready (attempt %s/%s). Retrying in %.1fs...",
            attempt,
            retries,
            backoff,
        )
        await asyncio.sleep(backoff)
        backoff *= 1.3
    raise RuntimeError("Database not reachable after retries.")


async def dispose_engine() -> None:
    """Dispose of the global AsyncEngine, closing all connections.

    Should be called on application shutdown to release all database
    resources and close the connection pool.
    """
    await engine.dispose()
