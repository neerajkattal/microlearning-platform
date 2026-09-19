from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import require_operator_key
from ..database import get_db
from ..ingestion import run_ingestion
from ..question_sources.opentdb import OpenTDBProvider
from ..question_sources.quizapi import QuizApiProvider

# Content-mutating and calls a rate-limited external API on your behalf -
# gated by the same shared X-Admin-Key as /admin/bootstrap (see
# auth.require_operator_key). This used to be wide open ("no auth system
# in Phase 0/1" per an earlier comment here) - fixed now that a real
# operator secret exists, since anyone with the URL could otherwise
# trigger ingestion repeatedly and burn through QuizAPI.io's rate limit.
router = APIRouter(prefix="/ingestion", tags=["ingestion"], dependencies=[Depends(require_operator_key)])


@router.post("/opentdb", response_model=schemas.IngestionResultOut)
def ingest_opentdb(payload: schemas.IngestionRequest, db: Session = Depends(get_db)):
    provider = OpenTDBProvider()
    result = run_ingestion(db, provider, amount=payload.amount, category=payload.category, source_name="opentdb")
    return schemas.IngestionResultOut(
        fetched=result.fetched,
        inserted=result.inserted,
        skipped_duplicate=result.skipped_duplicate,
        skipped_malformed=result.skipped_malformed,
        errors=result.errors,
    )


@router.post("/quizapi", response_model=schemas.IngestionResultOut)
def ingest_quizapi(payload: schemas.IngestionRequest, db: Session = Depends(get_db)):
    provider = QuizApiProvider()
    result = run_ingestion(db, provider, amount=payload.amount, category=payload.category, source_name="quizapi")
    return schemas.IngestionResultOut(
        fetched=result.fetched,
        inserted=result.inserted,
        skipped_duplicate=result.skipped_duplicate,
        skipped_malformed=result.skipped_malformed,
        errors=result.errors,
    )
