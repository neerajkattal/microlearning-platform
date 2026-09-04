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

export interface CompleteSessionResult {
  session_id: number;
  score: number;
  total_questions: number;
  xp_earned: number;
  total_xp: number;
  level: number;
  streak: number;
}
