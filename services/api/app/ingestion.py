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


# Tally of what happened during one ingestion run — how many questions were
# fetched from the provider, how many actually got inserted, how many were
# skipped as duplicates/malformed, and any error messages along the way.
@dataclass
class IngestionResult:
    fetched: int = 0
    inserted: int = 0
    skipped_duplicate: int = 0
    skipped_malformed: int = 0
    errors: list[str] = field(default_factory=list)


# Turns a human-readable category name into a URL/DB-friendly slug
# (lowercase, dashes instead of spaces/punctuation).
def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "uncategorized"


# Builds a stable fingerprint for a question, used to detect duplicates.
def _content_hash(raw: RawQuestion) -> str:
    """OpenTDB has no stable per-question id (see OpenTDBProvider docstring).
    Hash the normalized text+category+difficulty instead, so re-ingesting
    the same question — even fetched at a different time, in a different
    batch — is recognized as a duplicate rather than inserted again."""
    key = f"{raw.text}|{raw.category}|{raw.difficulty}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]


# Looks up a Category row by name (via its slug), creating it first if this
# is the first time a question in this category has been ingested.
def get_or_create_category(db: Session, name: str) -> models.Category:
    slug = _slugify(name)
    category = db.query(models.Category).filter_by(slug=slug).first()
    if category:
        return category
    category = models.Category(name=name, slug=slug)
    db.add(category)
    db.flush()
    return category


# Looks up a QuestionSource row by name (e.g. "opentdb", "quizapi"),
# creating it first if this source has never been ingested from before.
def get_or_create_source(db: Session, name: str, base_url: str | None = None) -> models.QuestionSource:
    source = db.query(models.QuestionSource).filter_by(name=name).first()
    if source:
        return source
    source = models.QuestionSource(name=name, base_url=base_url)
    db.add(source)
    db.flush()
    return source


# Calls the provider's fetch_batch, retrying with exponential backoff on
# network/HTTP errors up to MAX_RETRIES times before giving up.
def _fetch_with_retry(provider: QuestionProvider, amount: int, category: str | None = None) -> list[RawQuestion]:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return provider.fetch_batch(amount=amount, category=category)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
                logger.warning(f"fetch_batch attempt {attempt} failed ({exc!r}), retrying in {delay}s")
                time.sleep(delay)
    assert last_error is not None
    raise last_error


# Persists a single raw question (and its answers) as a Question row,
# unless it's already been ingested before or is missing required fields.
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


# Top-level entry point: fetches a batch of questions from the given
# provider and persists whichever ones are new, returning a summary of
# what happened. This is what the /ingestion/* routes call.
def run_ingestion(
    db: Session,
    provider: QuestionProvider,
    *,
    amount: int,
    category: str | None = None,
    source_name: str = "opentdb",
) -> IngestionResult:
    result = IngestionResult()
    source = get_or_create_source(db, source_name)

    try:
        raw_questions = _fetch_with_retry(provider, amount, category)
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
