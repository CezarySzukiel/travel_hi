from pydantic import Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(".env/.env")


class Settings(BaseSettings):
    POSTGRES_USER: str = Field(..., alias="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(..., alias="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(..., alias="POSTGRES_DB")
    POSTGRES_PORT: int = Field(5432, alias="POSTGRES_PORT")
    POSTGRES_HOST: str = Field(..., alias="POSTGRES_HOST")
    POSTGRES_ASYNC_DRIVER: str = "postgresql+asyncpg://"
    POSTGRES_SYNC_DRIVER: str = "postgresql+psycopg://"

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_PRE_PING: bool = True
    DB_ECHO: bool = False

    DB_STATEMENT_TIMEOUT_S: int = 30

    DB_CONNECT_RETRIES: int = 10
    DB_CONNECT_BACKOFF_S: float = 1.5

    MAX_IMAGE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    IMAGES_UPLOAD_DIR: str = Field("uploaded_images", alias="IMAGES_UPLOAD_DIR")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"{self.POSTGRES_ASYNC_DRIVER}"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    JWT_PUBLIC_KEY: str = Field(..., alias="JWT_PUBLIC_KEY")
    JWT_ALGORITHM: str = Field("RS256", alias="JWT_ALGORITHM")

    @property
    def JWT_PUBLIC_KEY_PEM(self) -> str:
        return self.JWT_PUBLIC_KEY.replace("\\n", "\n")


settings = Settings()
