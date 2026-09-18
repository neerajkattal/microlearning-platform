from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .avatars import AVATAR_KEYS
from .moderation import contains_banned_word


class IngestionRequest(BaseModel):
    amount: int = Field(default=10, ge=1, le=50)
    # OpenTDB's own numeric category id (9-32, from its /api_category.php),
    # not one of our internal Category rows - those are created dynamically
    # from whatever category name a question arrives with and have no fixed
    # id to pass back in. Omit to fetch OpenTDB's normal random mix.
    category: Optional[str] = None


class IngestionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fetched: int
    inserted: int
    skipped_duplicate: int
    skipped_malformed: int
    errors: list[str]


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    question_count: int


class QuestionSummaryOut(BaseModel):
    # Deliberately no answers/choices here — this is a Phase 1 content-pool
    # visibility endpoint, not the player-facing question fetch. That's
    # Phase 2's Quiz Engine, which owns session-scoped answer randomization
    # and must never leak `isCorrect` (see CLAUDE.md "Security boundary").
    id: int
    text: str
    difficulty: str
    category: str
    source: str
    created_at: datetime


class StartQuizSessionRequest(BaseModel):
    category: Optional[str] = None
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    question_count: int = Field(default=5, ge=1, le=20)


class AnswerChoiceOut(BaseModel):
    # id + text only — never isCorrect (CLAUDE.md "Security boundary").
    id: int
    text: str


class SessionQuestionOut(BaseModel):
    session_question_id: int
    question_id: int
    prompt: str
    difficulty: str
    choices: list[AnswerChoiceOut]


class QuizSessionOut(BaseModel):
    id: int
    status: str
    questions: list[SessionQuestionOut]


class SubmitAnswerRequest(BaseModel):
    selected_answer_id: int
    response_time_ms: Optional[int] = Field(default=None, ge=0)


class HintOut(BaseModel):
    # Exactly 2 answer ids, guaranteed wrong - never enough on its own to
    # infer which of the remaining 2 is correct (CLAUDE.md "Security
    # boundary"). See quiz_engine.sessions.get_hint for why this is
    # deterministic per question rather than re-randomized per call.
    eliminated_answer_ids: list[int]


class SubmitAnswerResult(BaseModel):
    is_correct: bool
    correct_answer_id: int
    explanation: Optional[str]
    xp_earned: int


class AchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str
    icon: Optional[str]


class AnswerReviewOut(BaseModel):
    # Safe to expose only now - the session is already completed, so
    # revealing correct_answer here can no longer let a client cheat on
    # a question it hasn't submitted yet (CLAUDE.md "Security boundary").
    question_id: int
    prompt: str
    your_answer: Optional[str]  # null if the question was never answered
    correct_answer: str
    is_correct: bool


class CompleteSessionResult(BaseModel):
    session_id: int
    score: int
    total_questions: int
    xp_earned: int
    total_xp: int
    level: int
    streak: int
    achievements_earned: list[AchievementOut] = []
    review: list[AnswerReviewOut] = []


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    # Omit to fall back to DEFAULT_AVATAR - picking a character is a nice
    # first-run moment, not something registration should hard-require.
    avatar: Optional[str] = None

    @field_validator("username")
    @classmethod
    def _username_must_be_clean(cls, value: str) -> str:
        # Catches the obvious cases before they ever reach the leaderboard.
        # Not exhaustive (see moderation.py) - the admin rename/hide tools
        # exist for whatever slips past this.
        if contains_banned_word(value):
            raise ValueError("That username isn't allowed - please choose another one.")
        return value

    @field_validator("avatar")
    @classmethod
    def _avatar_must_be_known(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in AVATAR_KEYS:
            raise ValueError(f"avatar must be one of {AVATAR_KEYS}")
        return value


class LoginRequest(BaseModel):
    username: str
    password: str


class UpdateProfileRequest(BaseModel):
    avatar: str

    @field_validator("avatar")
    @classmethod
    def _avatar_must_be_known(cls, value: str) -> str:
        if value not in AVATAR_KEYS:
            raise ValueError(f"avatar must be one of {AVATAR_KEYS}")
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    avatar: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserStatsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    xp: int
    level: int
    current_streak: int
    longest_streak: int


class UserMeOut(BaseModel):
    user: UserOut
    stats: UserStatsOut
    achievements: list[AchievementOut]


class LeaderboardEntryOut(BaseModel):
    username: str
    avatar: str
    xp: int
    level: int
    badges: int


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    hidden_from_leaderboard: bool


class RenameUserRequest(BaseModel):
    new_username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")

    @field_validator("new_username")
    @classmethod
    def _new_username_must_be_clean(cls, value: str) -> str:
        if contains_banned_word(value):
            raise ValueError("That username isn't allowed - please choose another one.")
        return value


class AdminBootstrapRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_username: str


class AdminUserDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    last_login_at: Optional[datetime]
    hidden_from_leaderboard: bool


class StatsOut(BaseModel):
    total_users: int
    total_questions: int
    total_categories: int
    total_quiz_sessions: int
    questions_per_category: list[dict]


class ActivityLogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    user_id: Optional[int]
    username: Optional[str]
    detail: Optional[str]
    created_at: datetime


class AdminCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    is_active: bool
    question_count: int


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=64)
    is_active: Optional[bool] = None


class AdminAnswerIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    is_correct: bool = False


class AdminAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    is_correct: bool


class AdminQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    category_id: int
    difficulty: str
    explanation: Optional[str]
    is_active: bool
    answers: list[AdminAnswerOut]


class QuestionCreateRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)
    category_id: int
    difficulty: Literal["easy", "medium", "hard"]
    explanation: Optional[str] = None
    answers: list[AdminAnswerIn] = Field(min_length=2, max_length=6)

    @field_validator("answers")
    @classmethod
    def _exactly_one_correct_answer(cls, value: list[AdminAnswerIn]) -> list[AdminAnswerIn]:
        correct_count = sum(1 for a in value if a.is_correct)
        if correct_count != 1:
            raise ValueError("exactly one answer must be marked correct")
        return value


class QuestionUpdateRequest(BaseModel):
    text: Optional[str] = Field(default=None, min_length=3, max_length=500)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    explanation: Optional[str] = None
    is_active: Optional[bool] = None


class GameConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    base_correct_xp: int
    attempt_xp: int
    difficulty_multiplier_easy: float
    difficulty_multiplier_medium: float
    difficulty_multiplier_hard: float
    speed_bonus_threshold_ms: int
    speed_bonus_xp: int
    max_streak_bonus_days: int
    streak_bonus_xp_per_day: int
    xp_per_level: int


class GameConfigUpdateRequest(BaseModel):
    base_correct_xp: Optional[int] = Field(default=None, ge=0, le=1000)
    attempt_xp: Optional[int] = Field(default=None, ge=0, le=1000)
    difficulty_multiplier_easy: Optional[float] = Field(default=None, ge=0, le=10)
    difficulty_multiplier_medium: Optional[float] = Field(default=None, ge=0, le=10)
    difficulty_multiplier_hard: Optional[float] = Field(default=None, ge=0, le=10)
    speed_bonus_threshold_ms: Optional[int] = Field(default=None, ge=0, le=60000)
    speed_bonus_xp: Optional[int] = Field(default=None, ge=0, le=1000)
    max_streak_bonus_days: Optional[int] = Field(default=None, ge=0, le=365)
    streak_bonus_xp_per_day: Optional[int] = Field(default=None, ge=0, le=1000)
    xp_per_level: Optional[int] = Field(default=None, ge=1, le=100000)
