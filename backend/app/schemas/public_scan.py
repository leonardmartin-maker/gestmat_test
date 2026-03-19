from pydantic import BaseModel


class PublicAssetOut(BaseModel):
    """Limited asset info for employee self-service display."""

    public_id: str
    name: str
    category: str  # VEHICLE / EPI
    status: str  # AVAILABLE / ASSIGNED / MAINTENANCE / RETIRED

    # Vehicle
    plate: str | None = None
    km_current: int | None = None

    # EPI
    epi_type: str | None = None

    model_config = {"from_attributes": True}


class PhotoOut(BaseModel):
    id: int
    category: str  # STATE / DAMAGE
    url: str


class PublicActionResult(BaseModel):
    success: bool
    message: str
    asset: PublicAssetOut
    photos: list[PhotoOut] = []
