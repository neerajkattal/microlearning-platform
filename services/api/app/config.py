from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://microlearning:microlearning@localhost:5432/microlearning"
    redis_url: str = "redis://localhost:6379/0"
    opentdb_base_url: str = "https://opentdb.com/api.php"
    api_env: str = "development"

    # Dev-only default — a real deployment must override this via the
    # JWT_SECRET_KEY env var. Rotating it invalidates every issued token,
    # which is fine here (there's no "logged out everywhere" support to
    # preserve yet).
    jwt_secret_key: str = "dev-only-insecure-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days — no refresh-token flow yet


settings = Settings()
