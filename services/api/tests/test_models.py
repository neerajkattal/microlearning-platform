import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app import models

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def fresh_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


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


def test_user_stats_relationship(db):
    user = models.User(username="ada")
    db.add(user)
    db.flush()

    stats = models.UserStats(user_id=user.id, xp=10, level=1)
    db.add(stats)
    db.commit()

    db.refresh(user)
    assert user.stats.xp == 10


def test_question_answers_relationship(db):
    question = _make_question(db)
    db.add_all(
        [
            models.Answer(question_id=question.id, text="Venus", is_correct=False),
            models.Answer(question_id=question.id, text="Mercury", is_correct=True),
        ]
    )
    db.commit()

    db.refresh(question)
    assert len(question.answers) == 2
    assert sum(1 for a in question.answers if a.is_correct) == 1


def test_duplicate_source_question_id_is_rejected(db):
    category = models.Category(name="History", slug="history")
    source = models.QuestionSource(name="opentdb")
    db.add_all([category, source])
    db.flush()

    db.add(
        models.Question(
            text="Q1", category_id=category.id, difficulty="easy", source_id=source.id, source_question_id="dup"
        )
    )
    db.commit()

    db.add(
        models.Question(
            text="Q2", category_id=category.id, difficulty="easy", source_id=source.id, source_question_id="dup"
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_quiz_session_records_shown_answer_order(db):
    user = models.User(username="grace")
    question = _make_question(db)
    db.add(user)
    db.flush()

    session = models.QuizSession(user_id=user.id)
    db.add(session)
    db.flush()

    sq = models.QuizSessionQuestion(
        quiz_session_id=session.id, question_id=question.id, order=0, shown_answer_order=[3, 1, 2]
    )
    db.add(sq)
    db.commit()

    db.refresh(session)
    assert session.session_questions[0].shown_answer_order == [3, 1, 2]


def test_answer_attempt_is_one_per_session_question(db):
    user = models.User(username="turing")
    question = _make_question(db)
    db.add(user)
    db.flush()

    session = models.QuizSession(user_id=user.id)
    db.add(session)
    db.flush()

    sq = models.QuizSessionQuestion(
        quiz_session_id=session.id, question_id=question.id, order=0, shown_answer_order=[1]
    )
    db.add(sq)
    db.flush()

    db.add(models.AnswerAttempt(quiz_session_question_id=sq.id, is_correct=True))
    db.commit()

    db.add(models.AnswerAttempt(quiz_session_question_id=sq.id, is_correct=False))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_user_achievement_cannot_be_earned_twice(db):
    user = models.User(username="lovelace")
    achievement = models.Achievement(code="first_win", name="First Win", description="Win a quiz")
    db.add_all([user, achievement])
    db.flush()

    db.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
    db.commit()

    db.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
