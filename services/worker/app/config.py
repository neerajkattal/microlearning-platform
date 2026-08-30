from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://microlearning:microlearning@localhost:5432/microlearning"
    redis_url: str = "redis://localhost:6379/0"
    worker_env: str = "development"
    poll_interval_seconds: float = 5.0


settings = Settings()
