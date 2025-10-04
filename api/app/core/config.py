from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_PRE_PING: bool = True
    DB_ECHO: bool = False

    DB_STATEMENT_TIMEOUT_S: int = 30

    DB_CONNECT_RETRIES: int = 10
    DB_CONNECT_BACKOFF_S: float = 1.5

    @property
    def DATABASE_URL(self) -> str:
        return "sqlite+aiosqlite:///./app.db"


settings = Settings()
