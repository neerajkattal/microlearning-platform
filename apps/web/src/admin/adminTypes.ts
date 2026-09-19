export interface AdminTokenResponse {
  access_token: string;
  admin_username: string;
}

export interface AdminUserDetail {
  id: number;
  username: string;
  created_at: string;
  last_login_at: string | null;
  hidden_from_leaderboard: boolean;
}

export interface Stats {
  total_users: number;
  total_questions: number;
  total_categories: number;
  total_quiz_sessions: number;
  pending_topic_requests: number;
  questions_per_category: { category: string; count: number }[];
}

export interface TopicRequestItem {
  id: number;
  topic: string;
  request_count: number;
  status: "pending" | "fulfilled" | "dismissed";
  requested_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: number;
  event_type: string;
  user_id: number | null;
  username: string | null;
  detail: string | null;
  created_at: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  question_count: number;
}

export interface AdminAnswer {
  id: number;
  text: string;
  is_correct: boolean;
}

export interface AdminQuestion {
  id: number;
  text: string;
  category_id: number;
  difficulty: string;
  explanation: string | null;
  is_active: boolean;
  answers: AdminAnswer[];
}

export interface GameConfig {
  base_correct_xp: number;
  attempt_xp: number;
  difficulty_multiplier_easy: number;
  difficulty_multiplier_medium: number;
  difficulty_multiplier_hard: number;
  speed_bonus_threshold_ms: number;
  speed_bonus_xp: number;
  max_streak_bonus_days: number;
  streak_bonus_xp_per_day: number;
  xp_per_level: number;
}
