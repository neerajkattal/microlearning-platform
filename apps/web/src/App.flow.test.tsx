import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

describe("App — full quiz flow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options?: RequestInit) => {
        if (url === "/api/health") return jsonResponse({ status: "ok" });
        if (url === "/api/categories") {
          return jsonResponse([{ id: 1, name: "Math", slug: "math", question_count: 2 }]);
        }
        if (url === "/api/quiz-sessions" && options?.method === "POST") {
          return jsonResponse({
            id: 1,
            status: "in_progress",
            questions: [
              {
                session_question_id: 10,
                question_id: 100,
                prompt: "2 + 2?",
                difficulty: "easy",
                choices: [
                  { id: 1, text: "3" },
                  { id: 2, text: "4" },
                ],
              },
            ],
          });
        }
        if (url === "/api/quiz-sessions/1/questions/10/answer") {
          return jsonResponse({ is_correct: true, correct_answer_id: 2, explanation: null, xp_earned: 10 });
        }
        if (url === "/api/quiz-sessions/1/complete") {
          return jsonResponse({
            session_id: 1, score: 1, total_questions: 1, xp_earned: 10, total_xp: 10, level: 1, streak: 1,
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("goes category select -> quiz -> results end to end", async () => {
    render(<App />);

    await waitFor(() => screen.getByText("Math"));
    fireEvent.click(screen.getByText("Math"));

    await waitFor(() => screen.getByText("2 + 2?"));
    fireEvent.click(screen.getByText("4"));

    await waitFor(() => screen.getByText("See results"));
    fireEvent.click(screen.getByText("See results"));

    await waitFor(() => expect(screen.getByText("Quiz complete")).toBeTruthy());
    expect(screen.getByText("1 / 1 correct")).toBeTruthy();
  });

  it("'back to categories' returns to the category list", async () => {
    render(<App />);

    await waitFor(() => screen.getByText("Math"));
    fireEvent.click(screen.getByText("Math"));
    await waitFor(() => screen.getByText("2 + 2?"));
    fireEvent.click(screen.getByText("4"));
    await waitFor(() => screen.getByText("See results"));
    fireEvent.click(screen.getByText("See results"));
    await waitFor(() => screen.getByText("Back to categories"));

    fireEvent.click(screen.getByText("Back to categories"));

    await waitFor(() => expect(screen.getByText("Any category")).toBeTruthy());
  });
});
