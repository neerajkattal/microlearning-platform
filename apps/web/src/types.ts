export interface Category {
  id: number;
  name: string;
  slug: string;
  question_count: number;
}

export interface AnswerChoice {
  id: number;
  text: string;
}

export interface SessionQuestion {
  session_question_id: number;
  question_id: number;
  prompt: string;
  difficulty: string;
  choices: AnswerChoice[];
}

export interface QuizSession {
  id: number;
  status: "in_progress" | "completed" | "abandoned";
  questions: SessionQuestion[];
}

export interface SubmitAnswerResult {
  is_correct: boolean;
  correct_answer_id: number;
  explanation: string | null;
  xp_earned: number;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string | null;
}

export interface AnswerReview {
  question_id: number;
  prompt: string;
  your_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
}

export interface CompleteSessionResult {
  session_id: number;
  score: number;
  total_questions: number;
  xp_earned: number;
  total_xp: number;
  level: number;
  streak: number;
  achievements_earned: Achievement[];
  review: AnswerReview[];
}

export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserStats {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
}

export interface UserMe {
  user: User;
  stats: UserStats;
  achievements: Achievement[];
}

export interface LeaderboardEntry {
  username: string;
  xp: number;
  level: number;
}
