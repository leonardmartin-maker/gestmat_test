from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "gestionmateriel"
    ENV: str = "dev"

    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    FRONTEND_BASE_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Audit / RGPD
    AUDIT_ENABLED: bool = True
    AUDIT_RETENTION_DAYS: int = 90

    # RGPD: salt spécifique pour pseudonymiser l'IP (recommandé)
    # Si non fourni, on fallback sur JWT_SECRET côté code
    AUDIT_IP_SALT: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()