import type {
  Category,
  CompleteSessionResult,
  QuizSession,
  SubmitAnswerResult,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
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
