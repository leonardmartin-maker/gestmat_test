import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.middleware.audit import AuditContextMiddleware

logger = logging.getLogger("teltonika")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.TELTONIKA_ENABLED:
        from app.services.teltonika import start_tcp_server, stop_tcp_server
        server = await start_tcp_server(
            settings.TELTONIKA_TCP_HOST,
            settings.TELTONIKA_TCP_PORT,
        )
        logger.info("Teltonika TCP server started in lifespan")
    else:
        server = None

    yield

    # Shutdown
    if server:
        from app.services.teltonika import stop_tcp_server
        await stop_tcp_server(server)
        logger.info("Teltonika TCP server stopped in lifespan")


app = FastAPI(title="gestionmateriel", lifespan=lifespan)

# Serve uploaded files
_upload_dir = Path(settings.UPLOAD_DIR)
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditContextMiddleware)
app.include_router(api_router)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version="0.1.0",
        description="Gestion matériel SaaS",
        routes=app.routes,
    )

    openapi_schema.setdefault("components", {})
    openapi_schema["components"].setdefault("securitySchemes", {})
    openapi_schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }

    # Apply globally (Swagger adds the lock icons)
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi