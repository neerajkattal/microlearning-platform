/**
 * Client-safe view models for the quiz domain. These mirror the API's
 * response shapes, not the database models — in particular, an answer
 * choice here has no `isCorrect` field. The server never sends it (see
 * CLAUDE.md "Security boundary"), so it can't leak through these types
 * either.
 *
 * These are hand-written for now rather than generated from the API's
 * OpenAPI schema. Phase 2 (Quiz Engine) is the natural point to revisit
 * that — see docs/BUILD_PLAN.md.
 */

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface AnswerChoice {
  id: number;
  text: string;
}

export interface QuestionView {
  id: number;
  text: string;
  category: Category;
  difficulty: Difficulty;
  choices: AnswerChoice[];
}

export interface QuizSessionQuestionView {
  sessionQuestionId: number;
  question: QuestionView;
  order: number;
}

export interface AnswerAttemptRequest {
  sessionQuestionId: number;
  selectedAnswerId: number;
  responseTimeMs: number;
}

export interface AnswerAttemptResult {
  isCorrect: boolean;
  correctAnswerId: number;
  explanation: string | null;
}

export interface QuizSessionResult {
  sessionId: number;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  totalXp: number;
  streak: number;
}
