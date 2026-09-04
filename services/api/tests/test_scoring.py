from datetime import date
from unittest.mock import MagicMock

from app.quiz_engine.scoring import apply_daily_activity, calculate_level, calculate_xp


def test_wrong_answer_earns_flat_attempt_xp():
    xp = calculate_xp(is_correct=False, difficulty="hard", response_time_ms=100, current_streak=10)
    assert xp == 2


def test_correct_easy_answer_earns_base_xp():
    xp = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=None, current_streak=0)
    assert xp == 10


def test_difficulty_multiplier_applies_to_correct_answers():
    easy = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=None, current_streak=0)
    medium = calculate_xp(is_correct=True, difficulty="medium", response_time_ms=None, current_streak=0)
    hard = calculate_xp(is_correct=True, difficulty="hard", response_time_ms=None, current_streak=0)
    assert (easy, medium, hard) == (10, 15, 20)


def test_speed_bonus_applies_within_threshold():
    fast = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=4000, current_streak=0)
    slow = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=6000, current_streak=0)
    assert fast == 15  # 10 base + 5 speed bonus
    assert slow == 10  # no bonus, too slow


def test_streak_bonus_is_capped():
    at_cap = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=None, current_streak=10)
    over_cap = calculate_xp(is_correct=True, difficulty="easy", response_time_ms=None, current_streak=50)
    assert at_cap == 20  # 10 base + 10 streak bonus (capped at 10 days)
    assert over_cap == 20  # same — capped, not unbounded


def test_calculate_level_thresholds():
    assert calculate_level(0) == 1
    assert calculate_level(99) == 1
    assert calculate_level(100) == 2
    assert calculate_level(250) == 3


def test_apply_daily_activity_starts_streak_at_one():
    stats = MagicMock(current_streak=0, longest_streak=0, last_activity_date=None)
    result = apply_daily_activity(stats, date(2026, 9, 4))
    assert result == 1
    assert stats.last_activity_date == date(2026, 9, 4)


def test_apply_daily_activity_increments_on_consecutive_day():
    stats = MagicMock(current_streak=3, longest_streak=3, last_activity_date=date(2026, 9, 3))
    result = apply_daily_activity(stats, date(2026, 9, 4))
    assert result == 4
    assert stats.longest_streak == 4


def test_apply_daily_activity_resets_after_a_gap():
    stats = MagicMock(current_streak=7, longest_streak=7, last_activity_date=date(2026, 8, 20))
    result = apply_daily_activity(stats, date(2026, 9, 4))
    assert result == 1
    assert stats.longest_streak == 7  # longest streak is preserved, not reset


def test_apply_daily_activity_is_idempotent_within_the_same_day():
    stats = MagicMock(current_streak=2, longest_streak=2, last_activity_date=date(2026, 9, 4))
    result = apply_daily_activity(stats, date(2026, 9, 4))
    assert result == 2
