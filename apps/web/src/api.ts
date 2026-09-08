import { clearToken, getToken } from "./auth";
import type {
  AuthResponse,
  Category,
  CompleteSessionResult,
  LeaderboardEntry,
  QuizSession,
  SubmitAnswerResult,
  UserMe,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/** Thrown specifically for a 401 — distinct from a generic failed
 * request so callers (App's screen state machine) can react to "your
 * session expired" by bouncing back to login, instead of showing a
 * generic error. */
export class UnauthorizedError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError(`Request to ${path} failed: 401`);
  }
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (params: { username: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(params) }),

  login: (params: { username: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(params) }),

  getMe: () => request<UserMe>("/users/me"),

  getLeaderboard: () => request<LeaderboardEntry[]>("/leaderboard"),

  listCategories: () => request<Category[]>("/categories"),

  startQuizSession: (params: { category: string | null; questionCount: number }) =>
    request<QuizSession>("/quiz-sessions", {
      method: "POST",
      body: JSON.stringify({ category: params.category, question_count: params.questionCount }),
    }),

  getQuizSession: (sessionId: number) => request<QuizSession>(`/quiz-sessions/${sessionId}`),

  submitAnswer: (params: { sessionId: number; sessionQuestionId: number; selectedAnswerId: number; responseTimeMs: number }) =>
    request<SubmitAnswerResult>(
      `/quiz-sessions/${params.sessionId}/questions/${params.sessionQuestionId}/answer`,
      {
        method: "POST",
        body: JSON.stringify({
          selected_answer_id: params.selectedAnswerId,
          response_time_ms: params.responseTimeMs,
        }),
      }
    ),

  completeQuizSession: (sessionId: number) =>
    request<CompleteSessionResult>(`/quiz-sessions/${sessionId}/complete`, { method: "POST" }),
};
