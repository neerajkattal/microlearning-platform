from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://microlearning:microlearning@localhost:5432/microlearning"
    redis_url: str = "redis://localhost:6379/0"
    opentdb_base_url: str = "https://opentdb.com/api.php"
    api_env: str = "development"

    # QuizAPI.io: a second static trivia source (tech-focused categories
    # OpenTDB doesn't cover - Linux, Docker, DevOps, SQL), ingested through
    # the exact same worker-triggers-via-HTTP pattern as OpenTDB (see
    # ADR-0003). Empty by default - a real deployment sets this via the
    # QUIZAPI_KEY env var; ingestion simply can't run without it, same
    # failure mode as any other missing required secret.
    quizapi_base_url: str = "https://quizapi.io/api/v1/questions"
    quizapi_key: str = ""

    # Comma-separated list — dev default covers the local Vite dev server.
    # A real deployment overrides this via the CORS_ORIGINS env var (e.g.
    # the Vercel frontend's real origin). Kept as a single string setting
    # rather than a list because that's how a plain env var arrives.
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # Dev-only default — a real deployment must override this via the
    # JWT_SECRET_KEY env var. Rotating it invalidates every issued token,
    # which is fine here (there's no "logged out everywhere" support to
    # preserve yet).
    jwt_secret_key: str = "dev-only-insecure-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days — no refresh-token flow yet

    auth_rate_limit_max: int = 5
    auth_rate_limit_window_seconds: int = 60

    categories_cache_ttl_seconds: int = 300
    leaderboard_cache_ttl_seconds: int = 30

    # Ongoing admin access is a real username/password login (AdminUser,
    # routers/admin.py) - this key's only remaining job is gating POST
    # /admin/bootstrap, which creates the first (and normally only) admin
    # account. That endpoint also self-disables once any admin account
    # exists, but that check alone has a race right after a fresh deploy:
    # without this key, whoever hits /admin/bootstrap first - not
    # necessarily the real operator - becomes the admin. Dev-only default
    # - a real deployment must override this via the ADMIN_API_KEY env var.
    admin_api_key: str = "dev-only-insecure-admin-key-change-in-production"
    admin_jwt_expires_minutes: int = 60 * 12  # 12 hours - shorter-lived than player tokens


settings = Settings()
