from app import models
from app.achievements import check_and_award_achievements


def _make_user_with_stats(db, username="ach_user", xp=0, level=1, current_streak=0):
    user = models.User(username=username, password_hash="not-a-real-hash")
    db.add(user)
    db.flush()
    stats = models.UserStats(user_id=user.id, xp=xp, level=level, current_streak=current_streak)
    db.add(stats)
    db.commit()
    db.refresh(user)
    return user


def test_first_win_is_awarded_on_a_scoring_session(db_session):
    user = _make_user_with_stats(db_session)
    earned = check_and_award_achievements(
        db_session, user=user, score=1, total_questions=5, stats=user.stats
    )
    db_session.commit()

    codes = {a.code for a in earned}
    assert "first_win" in codes


def test_first_win_is_not_awarded_for_a_zero_score(db_session):
    user = _make_user_with_stats(db_session)
    earned = check_and_award_achievements(
        db_session, user=user, score=0, total_questions=5, stats=user.stats
    )
    assert earned == []


def test_perfect_score_requires_at_least_three_questions(db_session):
    user = _make_user_with_stats(db_session)
    earned_two = check_and_award_achievements(
        db_session, user=user, score=2, total_questions=2, stats=user.stats
    )
    assert "perfect_score" not in {a.code for a in earned_two}

    user2 = _make_user_with_stats(db_session, username="ach_user2")
    earned_three = check_and_award_achievements(
        db_session, user=user2, score=3, total_questions=3, stats=user2.stats
    )
    assert "perfect_score" in {a.code for a in earned_three}


def test_streak_and_level_and_xp_achievements(db_session):
    user = _make_user_with_stats(db_session, xp=100, level=5, current_streak=7)
    earned = check_and_award_achievements(
        db_session, user=user, score=0, total_questions=5, stats=user.stats
    )
    codes = {a.code for a in earned}
    assert {"streak_3", "streak_7", "level_5", "xp_100"} <= codes


def test_an_already_earned_achievement_is_never_awarded_twice(db_session):
    user = _make_user_with_stats(db_session, xp=100)
    first = check_and_award_achievements(
        db_session, user=user, score=0, total_questions=5, stats=user.stats
    )
    db_session.commit()
    db_session.refresh(user)
    assert "xp_100" in {a.code for a in first}

    second = check_and_award_achievements(
        db_session, user=user, score=0, total_questions=5, stats=user.stats
    )
    assert "xp_100" not in {a.code for a in second}
