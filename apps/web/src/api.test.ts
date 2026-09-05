import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

function mockFetchOnce(body: unknown, ok = true) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listCategories fetches /categories", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    const categories = await api.listCategories();
    expect(fetch).toHaveBeenCalledWith("/api/categories", expect.any(Object));
    expect(categories).toHaveLength(1);
  });

  it("startQuizSession posts category and question_count", async () => {
    mockFetchOnce({ id: 1, status: "in_progress", questions: [] });
    await api.startQuizSession({ category: "math", questionCount: 5 });

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/quiz-sessions");
    expect(JSON.parse(options.body)).toEqual({ category: "math", question_count: 5 });
  });

  it("submitAnswer posts to the correct nested path", async () => {
    mockFetchOnce({ is_correct: true, correct_answer_id: 5, explanation: null, xp_earned: 10 });
    await api.submitAnswer({ sessionId: 1, sessionQuestionId: 2, selectedAnswerId: 5, responseTimeMs: 1200 });

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/quiz-sessions/1/questions/2/answer");
    expect(JSON.parse(options.body)).toEqual({ selected_answer_id: 5, response_time_ms: 1200 });
  });

  it("completeQuizSession posts to the complete endpoint", async () => {
    mockFetchOnce({
      session_id: 1, score: 3, total_questions: 5, xp_earned: 30, total_xp: 30, level: 1, streak: 1,
    });
    const result = await api.completeQuizSession(1);

    expect(fetch).toHaveBeenCalledWith("/api/quiz-sessions/1/complete", expect.objectContaining({ method: "POST" }));
    expect(result.score).toBe(3);
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce({ detail: "not found" }, false);
    await expect(api.listCategories()).rejects.toThrow("Request to /categories failed: 400");
  });
});
