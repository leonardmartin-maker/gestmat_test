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

    # Uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_PHOTO_SIZE_MB: int = 5

    # SMTP (email de bienvenue employé)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@swissworktogether.ch"

    # OpenAI (optional — for fuel receipt OCR)
    OPENAI_API_KEY: str = ""

    # Teltonika GPS tracker
    TELTONIKA_ENABLED: bool = False
    TELTONIKA_TCP_HOST: str = "0.0.0.0"
    TELTONIKA_TCP_PORT: int = 5027

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()