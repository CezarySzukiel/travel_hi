from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".envs" / ".env"

# load_dotenv(ENV_PATH, override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    OPENAI_API_KEY: str = Field(..., description="Klucz OpenAI API")
    SECRET_KEY: str = Field(..., description="Secret dla JWT")

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_PRE_PING: bool = True
    DB_ECHO: bool = False

    MAX_IMAGE_BYTES: int = 5 * 1024 * 1024
    IMAGES_UPLOAD_DIR: str = "uploaded_images"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    @property
    def DATABASE_URL(self) -> str:
        return "sqlite+aiosqlite:///./app.db"


settings = Settings()
