import hashlib
import logging
import re
import time
from dataclasses import dataclass, field

import httpx
from sqlalchemy.orm import Session

from . import models
from .question_sources.provider import QuestionProvider, RawQuestion

logger = logging.getLogger("ingestion")

MAX_RETRIES = 3
BACKOFF_BASE_SECONDS = 0.5


@dataclass
class IngestionResult:
    fetched: int = 0
    inserted: int = 0
    skipped_duplicate: int = 0
    skipped_malformed: int = 0
    errors: list[str] = field(default_factory=list)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "uncategorized"


def _content_hash(raw: RawQuestion) -> str:
    """OpenTDB has no stable per-question id (see OpenTDBProvider docstring).
    Hash the normalized text+category+difficulty instead, so re-ingesting
    the same question — even fetched at a different time, in a different
    batch — is recognized as a duplicate rather than inserted again."""
    key = f"{raw.text}|{raw.category}|{raw.difficulty}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]


def get_or_create_category(db: Session, name: str) -> models.Category:
    slug = _slugify(name)
    category = db.query(models.Category).filter_by(slug=slug).first()
    if category:
        return category
    category = models.Category(name=name, slug=slug)
    db.add(category)
    db.flush()
    return category


def get_or_create_source(db: Session, name: str, base_url: str | None = None) -> models.QuestionSource:
    source = db.query(models.QuestionSource).filter_by(name=name).first()
    if source:
        return source
    source = models.QuestionSource(name=name, base_url=base_url)
    db.add(source)
    db.flush()
    return source


def _fetch_with_retry(provider: QuestionProvider, amount: int) -> list[RawQuestion]:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return provider.fetch_batch(amount=amount)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
                logger.warning(f"fetch_batch attempt {attempt} failed ({exc!r}), retrying in {delay}s")
                time.sleep(delay)
    assert last_error is not None
    raise last_error


def _ingest_one(db: Session, source: models.QuestionSource, raw: RawQuestion) -> str:
    """Returns 'inserted', 'duplicate', or raises on malformed input —
    callers decide whether one malformed item should abort the batch."""
    if not raw.text or not raw.correct_answer or len(raw.incorrect_answers) < 1:
        raise ValueError(f"malformed question from {raw.source}: missing required fields")

    content_hash = _content_hash(raw)
    existing = (
        db.query(models.Question)
        .filter_by(source_id=source.id, source_question_id=content_hash)
        .first()
    )
    if existing:
        return "duplicate"

    category = get_or_create_category(db, raw.category)
    question = models.Question(
        text=raw.text,
        category_id=category.id,
        difficulty=raw.difficulty,
        source_id=source.id,
        source_question_id=content_hash,
        license=raw.license,
    )
    db.add(question)
    db.flush()

    db.add(models.Answer(question_id=question.id, text=raw.correct_answer, is_correct=True))
    for incorrect in raw.incorrect_answers:
        db.add(models.Answer(question_id=question.id, text=incorrect, is_correct=False))

    return "inserted"


def run_ingestion(db: Session, provider: QuestionProvider, *, amount: int, source_name: str = "opentdb") -> IngestionResult:
    result = IngestionResult()
    source = get_or_create_source(db, source_name)

    try:
        raw_questions = _fetch_with_retry(provider, amount)
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        result.errors.append(f"fetch failed after {MAX_RETRIES} attempts: {exc!r}")
        return result

    result.fetched = len(raw_questions)

    for raw in raw_questions:
        try:
            outcome = _ingest_one(db, source, raw)
        except ValueError as exc:
            result.skipped_malformed += 1
            result.errors.append(str(exc))
            continue

        if outcome == "inserted":
            result.inserted += 1
        else:
            result.skipped_duplicate += 1

    db.commit()
    return result
