import pytest

from app import models
from app.quiz_engine import sessions as quiz_sessions
from app.quiz_engine.sessions import (
    AnswerNotFoundError,
    NoQuestionsAvailableError,
    QuestionAlreadyAnsweredError,
    SessionNotFoundError,
    SessionNotInProgressError,
)


def _make_question(db, text="2+2?", category_slug="math", correct="4", incorrect=None):
    category = db.query(models.Category).filter_by(slug=category_slug).first()
    if category is None:
        category = models.Category(name=category_slug.title(), slug=category_slug)
        db.add(category)
        db.flush()
    source = db.query(models.QuestionSource).filter_by(name="opentdb").first()
    if source is None:
        source = models.QuestionSource(name="opentdb")
        db.add(source)
        db.flush()

    question = models.Question(
        text=text,
        category_id=category.id,
        difficulty="easy",
        source_id=source.id,
        source_question_id=text,  # unique enough for tests
    )
    db.add(question)
    db.flush()
    db.add(models.Answer(question_id=question.id, text=correct, is_correct=True))
    for wrong in incorrect or ["3", "5", "22"]:
        db.add(models.Answer(question_id=question.id, text=wrong, is_correct=False))
    db.commit()
    db.refresh(question)
    return question


def _make_user(db, username="quiz_test_user"):
    user = models.User(username=username, password_hash="not-a-real-hash")
    db.add(user)
    db.flush()
    db.add(models.UserStats(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def test_start_session_creates_session_and_shuffled_questions(db_session):
    user = _make_user(db_session)
    for i in range(3):
        _make_question(db_session, text=f"Q{i}?")

    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=3)

    assert session.status == "in_progress"
    assert len(session.session_questions) == 3
    for sq in session.session_questions:
        assert len(sq.shown_answer_order) == 4
        assert set(sq.shown_answer_order) == {a.id for a in sq.question.answers}


def test_start_session_filters_by_category(db_session):
    user = _make_user(db_session)
    _make_question(db_session, text="math one", category_slug="math")
    _make_question(db_session, text="history one", category_slug="history")

    session = quiz_sessions.start_session(db_session, user=user, category_slug="math", question_count=5)

    assert len(session.session_questions) == 1
    assert session.session_questions[0].question.text == "math one"


def test_start_session_raises_when_no_questions_available(db_session):
    user = _make_user(db_session)
    with pytest.raises(NoQuestionsAvailableError):
        quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)


def test_start_session_raises_for_unknown_category(db_session):
    user = _make_user(db_session)
    _make_question(db_session)
    with pytest.raises(NoQuestionsAvailableError):
        quiz_sessions.start_session(db_session, user=user, category_slug="does-not-exist", question_count=1)


def test_submit_answer_reports_correctness_server_side(db_session):
    user = _make_user(db_session)
    question = _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    sq = session.session_questions[0]
    correct_answer = next(a for a in question.answers if a.is_correct)
    wrong_answer = next(a for a in question.answers if not a.is_correct)

    attempt, xp = quiz_sessions.submit_answer(
        db_session, session_id=session.id, session_question_id=sq.id,
        selected_answer_id=wrong_answer.id, response_time_ms=1000, owner_id=user.id,
    )
    assert attempt.is_correct is False
    assert xp == 2  # attempt XP only

    # reset to test the correct path too, on a fresh session question
    session2 = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    sq2 = session2.session_questions[0]
    attempt2, xp2 = quiz_sessions.submit_answer(
        db_session, session_id=session2.id, session_question_id=sq2.id,
        selected_answer_id=correct_answer.id, response_time_ms=1000, owner_id=user.id,
    )
    assert attempt2.is_correct is True
    assert xp2 == 15  # base 10 + speed bonus 5 (streak is 0, no bonus)


def test_submit_answer_rejects_answering_twice(db_session):
    user = _make_user(db_session)
    question = _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    sq = session.session_questions[0]
    answer = question.answers[0]

    quiz_sessions.submit_answer(
        db_session, session_id=session.id, session_question_id=sq.id,
        selected_answer_id=answer.id, response_time_ms=None, owner_id=user.id,
    )
    with pytest.raises(QuestionAlreadyAnsweredError):
        quiz_sessions.submit_answer(
            db_session, session_id=session.id, session_question_id=sq.id,
            selected_answer_id=answer.id, response_time_ms=None, owner_id=user.id,
        )


def test_submit_answer_rejects_answer_from_a_different_question(db_session):
    user = _make_user(db_session)
    _make_question(db_session, text="Q1?")
    other_question = _make_question(db_session, text="Q2?")
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    sq = session.session_questions[0]

    foreign_answer = other_question.answers[0]
    if foreign_answer.question_id == sq.question_id:
        # start_session picked Q2 — use Q1's answer instead to keep the test meaningful
        foreign_answer = next(a for a in db_session.query(models.Answer) if a.question_id != sq.question_id)

    with pytest.raises(AnswerNotFoundError):
        quiz_sessions.submit_answer(
            db_session, session_id=session.id, session_question_id=sq.id,
            selected_answer_id=foreign_answer.id, response_time_ms=None, owner_id=user.id,
        )


def test_submit_answer_rejects_session_not_in_progress(db_session):
    user = _make_user(db_session)
    _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    sq = session.session_questions[0]
    answer = sq.question.answers[0]
    quiz_sessions.submit_answer(
        db_session, session_id=session.id, session_question_id=sq.id,
        selected_answer_id=answer.id, response_time_ms=None, owner_id=user.id,
    )
    quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)

    with pytest.raises(SessionNotInProgressError):
        quiz_sessions.submit_answer(
            db_session, session_id=session.id, session_question_id=sq.id,
            selected_answer_id=answer.id, response_time_ms=None, owner_id=user.id,
        )


def test_submit_answer_rejects_a_session_owned_by_someone_else(db_session):
    owner = _make_user(db_session, "owner")
    intruder = _make_user(db_session, "intruder")
    _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=owner, category_slug=None, question_count=1)
    sq = session.session_questions[0]
    answer = sq.question.answers[0]

    with pytest.raises(SessionNotFoundError):
        quiz_sessions.submit_answer(
            db_session, session_id=session.id, session_question_id=sq.id,
            selected_answer_id=answer.id, response_time_ms=None, owner_id=intruder.id,
        )


def test_complete_session_raises_for_unknown_session(db_session):
    user = _make_user(db_session)
    with pytest.raises(SessionNotFoundError):
        quiz_sessions.complete_session(db_session, 999, owner_id=user.id)


def test_complete_session_raises_for_a_session_owned_by_someone_else(db_session):
    owner = _make_user(db_session, "owner2")
    intruder = _make_user(db_session, "intruder2")
    _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=owner, category_slug=None, question_count=1)

    with pytest.raises(SessionNotFoundError):
        quiz_sessions.complete_session(db_session, session.id, owner_id=intruder.id)


def test_complete_session_updates_user_stats(db_session):
    user = _make_user(db_session)
    for i in range(2):
        _make_question(db_session, text=f"Q{i}?")
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=2)

    for sq in session.session_questions:
        correct = next(a for a in sq.question.answers if a.is_correct)
        quiz_sessions.submit_answer(
            db_session, session_id=session.id, session_question_id=sq.id,
            selected_answer_id=correct.id, response_time_ms=None, owner_id=user.id,
        )

    result = quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)

    assert result["score"] == 2
    assert result["total_questions"] == 2
    assert result["xp_earned"] == 20  # 2 x 10 base (no speed bonus, streak was 0)
    assert result["total_xp"] == 20
    assert result["streak"] == 1
    assert result["level"] == 1

    db_session.refresh(user)
    assert user.stats.xp == 20
    assert user.stats.current_streak == 1


def test_complete_session_only_credits_answered_questions(db_session):
    user = _make_user(db_session)
    for i in range(2):
        _make_question(db_session, text=f"Q{i}?")
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=2)

    # answer only the first question, leave the second unanswered
    sq = session.session_questions[0]
    correct = next(a for a in sq.question.answers if a.is_correct)
    quiz_sessions.submit_answer(
        db_session, session_id=session.id, session_question_id=sq.id,
        selected_answer_id=correct.id, response_time_ms=None, owner_id=user.id,
    )

    result = quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)
    assert result["score"] == 1
    assert result["total_questions"] == 2  # total reflects the session size, not just answered ones

    # the unanswered question still shows up in the review, with no
    # answer of its own but the correct one still revealed (safe now
    # that the session is over - see schemas.AnswerReviewOut)
    unanswered = next(r for r in result["review"] if r["question_id"] == session.session_questions[1].question_id)
    assert unanswered["your_answer"] is None
    assert unanswered["is_correct"] is False
    assert unanswered["correct_answer"]


def test_complete_session_review_includes_prompt_and_chosen_and_correct_answers(db_session):
    user = _make_user(db_session)
    _make_question(db_session, text="2+2?", correct="4", incorrect=["3", "5", "22"])
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)

    sq = session.session_questions[0]
    wrong_answer = next(a for a in sq.question.answers if not a.is_correct)
    quiz_sessions.submit_answer(
        db_session, session_id=session.id, session_question_id=sq.id,
        selected_answer_id=wrong_answer.id, response_time_ms=None, owner_id=user.id,
    )

    result = quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)

    assert result["review"] == [
        {
            "question_id": sq.question_id,
            "prompt": "2+2?",
            "your_answer": wrong_answer.text,
            "correct_answer": "4",
            "is_correct": False,
        }
    ]


def test_complete_session_cannot_be_called_twice(db_session):
    user = _make_user(db_session)
    _make_question(db_session)
    session = quiz_sessions.start_session(db_session, user=user, category_slug=None, question_count=1)
    quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)

    with pytest.raises(SessionNotInProgressError):
        quiz_sessions.complete_session(db_session, session.id, owner_id=user.id)
