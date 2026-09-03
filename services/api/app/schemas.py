from pydantic import BaseModel, ConfigDict, Field


class IngestionRequest(BaseModel):
    amount: int = Field(default=10, ge=1, le=50)


class IngestionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fetched: int
    inserted: int
    skipped_duplicate: int
    skipped_malformed: int
    errors: list[str]
