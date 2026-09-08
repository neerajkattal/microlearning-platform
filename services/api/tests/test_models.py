import pytest
from sqlalchemy.exc import IntegrityError

from app import models


def _make_question(db):
    category = models.Category(name="Science", slug="science")
    source = models.QuestionSource(name="opentdb", base_url="https://opentdb.com/api.php")
    db.add_all([category, source])
    db.flush()

    question = models.Question(
        text="What planet is closest to the sun?",
        category_id=category.id,
        difficulty="easy",
        source_id=source.id,
        source_question_id="123",
    )
    db.add(question)
    db.flush()
    return question


def test_user_stats_relationship(db_session):
    user = models.User(username="ada", password_hash="not-a-real-hash")
    db_session.add(user)
    db_session.flush()

    stats = models.UserStats(user_id=user.id, xp=10, level=1)
    db_session.add(stats)
    db_session.commit()

    db_session.refresh(user)
    assert user.stats.xp == 10


def test_question_answers_relationship(db_session):
    question = _make_question(db_session)
    db_session.add_all(
        [
            models.Answer(question_id=question.id, text="Venus", is_correct=False),
            models.Answer(question_id=question.id, text="Mercury", is_correct=True),
        ]
    )
    db_session.commit()

    db_session.refresh(question)
    assert len(question.answers) == 2
    assert sum(1 for a in question.answers if a.is_correct) == 1


def test_duplicate_source_question_id_is_rejected(db_session):
    category = models.Category(name="History", slug="history")
    source = models.QuestionSource(name="opentdb")
    db_session.add_all([category, source])
    db_session.flush()

    db_session.add(
        models.Question(
            text="Q1", category_id=category.id, difficulty="easy", source_id=source.id, source_question_id="dup"
        )
    )
    db_session.commit()

    db_session.add(
        models.Question(
            text="Q2", category_id=category.id, difficulty="easy", source_id=source.id, source_question_id="dup"
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_quiz_session_records_shown_answer_order(db_session):
    user = models.User(username="grace", password_hash="not-a-real-hash")
    question = _make_question(db_session)
    db_session.add(user)
    db_session.flush()

    session = models.QuizSession(user_id=user.id)
    db_session.add(session)
    db_session.flush()

    sq = models.QuizSessionQuestion(
        quiz_session_id=session.id, question_id=question.id, order=0, shown_answer_order=[3, 1, 2]
    )
    db_session.add(sq)
    db_session.commit()

    db_session.refresh(session)
    assert session.session_questions[0].shown_answer_order == [3, 1, 2]


def test_answer_attempt_is_one_per_session_question(db_session):
    user = models.User(username="turing", password_hash="not-a-real-hash")
    question = _make_question(db_session)
    db_session.add(user)
    db_session.flush()

    session = models.QuizSession(user_id=user.id)
    db_session.add(session)
    db_session.flush()

    sq = models.QuizSessionQuestion(
        quiz_session_id=session.id, question_id=question.id, order=0, shown_answer_order=[1]
    )
    db_session.add(sq)
    db_session.flush()

    db_session.add(models.AnswerAttempt(quiz_session_question_id=sq.id, is_correct=True))
    db_session.commit()

    db_session.add(models.AnswerAttempt(quiz_session_question_id=sq.id, is_correct=False))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_user_achievement_cannot_be_earned_twice(db_session):
    user = models.User(username="lovelace", password_hash="not-a-real-hash")
    achievement = models.Achievement(code="first_win", name="First Win", description="Win a quiz")
    db_session.add_all([user, achievement])
    db_session.flush()

    db_session.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
    db_session.commit()

    db_session.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
