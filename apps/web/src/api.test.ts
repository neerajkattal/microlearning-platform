import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, UnauthorizedError } from "./api";
import { clearToken, setToken } from "./auth";

// This environment's jsdom doesn't actually implement a working
// localStorage (real browsers do — this is purely a test-env gap, same
// category as jsdom's lack of a real <canvas>), so ./auth is mocked
// with an in-memory stand-in rather than exercising real localStorage.
vi.mock("./auth", () => {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string) => {
      token = t;
    },
    clearToken: () => {
      token = null;
    },
  };
});

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 400) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearToken();
  });

  it("listCategories fetches /categories", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    const categories = await api.listCategories();
    expect(fetch).toHaveBeenCalledWith("/api/categories", expect.any(Object));
    expect(categories).toHaveLength(1);
  });

  it("startQuizSession posts category, difficulty, and question_count", async () => {
    mockFetchOnce({ id: 1, status: "in_progress", questions: [] });
    await api.startQuizSession({ category: "math", difficulty: "hard", questionCount: 5 });

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/quiz-sessions");
    expect(JSON.parse(options.body)).toEqual({ category: "math", difficulty: "hard", question_count: 5 });
  });

  it("startQuizSession defaults difficulty to null when omitted", async () => {
    mockFetchOnce({ id: 1, status: "in_progress", questions: [] });
    await api.startQuizSession({ category: "math", questionCount: 5 });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ category: "math", difficulty: null, question_count: 5 });
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

  it("register posts username and password", async () => {
    mockFetchOnce({ access_token: "tok", token_type: "bearer", user: { id: 1, username: "alice" } });
    await api.register({ username: "alice", password: "correct-horse" });

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(JSON.parse(options.body)).toEqual({ username: "alice", password: "correct-horse" });
  });

  it("login posts username and password", async () => {
    mockFetchOnce({ access_token: "tok", token_type: "bearer", user: { id: 1, username: "alice" } });
    await api.login({ username: "alice", password: "correct-horse" });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/auth/login");
  });

  it("attaches an Authorization header once a token is stored", async () => {
    setToken("my-jwt");
    mockFetchOnce([]);
    await api.listCategories();

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-jwt");
  });

  it("sends no Authorization header when no token is stored", async () => {
    mockFetchOnce([]);
    await api.listCategories();

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("throws UnauthorizedError and clears the stored token on a 401", async () => {
    setToken("stale-token");
    mockFetchOnce({ detail: "expired" }, false, 401);

    await expect(api.getMe()).rejects.toBeInstanceOf(UnauthorizedError);

    mockFetchOnce([]);
    await api.listCategories();
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("getLeaderboard fetches /leaderboard", async () => {
    mockFetchOnce([{ username: "alice", xp: 100, level: 2 }]);
    const board = await api.getLeaderboard();
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard", expect.any(Object));
    expect(board).toHaveLength(1);
  });
});
