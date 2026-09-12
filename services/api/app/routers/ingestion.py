from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..ingestion import run_ingestion
from ..question_sources.opentdb import OpenTDBProvider

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

# Not authenticated yet — there's no auth system in Phase 0/1 (see
# docs/architecture/PHASE_1.md, Known gaps). `amount` is capped at 50 by
# IngestionRequest, which bounds how much any single call can do even if
# hit directly; real access control is Phase 7 (production hardening).


@router.post("/opentdb", response_model=schemas.IngestionResultOut)
def ingest_opentdb(payload: schemas.IngestionRequest, db: Session = Depends(get_db)):
    provider = OpenTDBProvider()
    result = run_ingestion(db, provider, amount=payload.amount, category=payload.category)
    return schemas.IngestionResultOut(
        fetched=result.fetched,
        inserted=result.inserted,
        skipped_duplicate=result.skipped_duplicate,
        skipped_malformed=result.skipped_malformed,
        errors=result.errors,
    )
