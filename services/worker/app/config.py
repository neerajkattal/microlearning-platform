from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://microlearning:microlearning@localhost:5432/microlearning"
    redis_url: str = "redis://localhost:6379/0"
    worker_env: str = "development"
    poll_interval_seconds: float = 5.0
    api_base_url: str = "http://api:8000"
    opentdb_ingestion_interval_seconds: float = 3600.0
    opentdb_ingestion_amount: int = 20
    opentdb_ingestion_max_retries: int = 3
    opentdb_ingestion_backoff_base_seconds: float = 1.0

    quizapi_ingestion_interval_seconds: float = 3600.0
    quizapi_ingestion_amount: int = 20
    quizapi_ingestion_max_retries: int = 3
    quizapi_ingestion_backoff_base_seconds: float = 1.0

    # Same shared secret as the API's ADMIN_API_KEY - every /ingestion/*
    # call now requires it (see auth.require_operator_key). Empty by
    # default; a real deployment sets this to match the API's own value.
    admin_api_key: str = ""


settings = Settings()
