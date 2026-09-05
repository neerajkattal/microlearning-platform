import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuizQuestion } from "./QuizQuestion";
import type { QuizSession } from "../types";

function mockFetchOnce(body: unknown) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

const twoQuestionSession: QuizSession = {
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
    {
      session_question_id: 11,
      question_id: 101,
      prompt: "3 + 3?",
      difficulty: "easy",
      choices: [
        { id: 3, text: "6" },
        { id: 4, text: "7" },
      ],
    },
  ],
};

describe("QuizQuestion", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the first question's prompt and choices", () => {
    render(<QuizQuestion session={twoQuestionSession} onComplete={vi.fn()} />);
    expect(screen.getByText("2 + 2?")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
  });

  it("submits the selected answer and shows feedback", async () => {
    mockFetchOnce({ is_correct: true, correct_answer_id: 2, explanation: null, xp_earned: 10 });
    render(<QuizQuestion session={twoQuestionSession} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText("4"));

    await waitFor(() => expect(screen.getByText(/Correct!/)).toBeTruthy());
    expect(screen.getByText(/\+10 XP/)).toBeTruthy();

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/quiz-sessions/1/questions/10/answer");
    expect(JSON.parse(options.body).selected_answer_id).toBe(2);
  });

  it("disables all choice buttons after answering", async () => {
    mockFetchOnce({ is_correct: false, correct_answer_id: 2, explanation: null, xp_earned: 2 });
    render(<QuizQuestion session={twoQuestionSession} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText("3"));
    await waitFor(() => expect(screen.getByText(/Not quite/)).toBeTruthy());

    const threeButton = screen.getByText("3").closest("button");
    const fourButton = screen.getByText("4").closest("button");
    expect(threeButton?.disabled).toBe(true);
    expect(fourButton?.disabled).toBe(true);
  });

  it("advances to the next question and resets state", async () => {
    mockFetchOnce({ is_correct: true, correct_answer_id: 2, explanation: null, xp_earned: 10 });
    render(<QuizQuestion session={twoQuestionSession} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText("4"));
    await waitFor(() => screen.getByText("Next question"));
    fireEvent.click(screen.getByText("Next question"));

    expect(screen.getByText("3 + 3?")).toBeTruthy();
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    // no lingering feedback from the previous question
    expect(screen.queryByText(/Correct!/)).toBeNull();
  });

  it("completes the session after the last question and calls onComplete", async () => {
    const oneQuestionSession: QuizSession = {
      id: 2,
      status: "in_progress",
      questions: [twoQuestionSession.questions[0]],
    };
    mockFetchOnce({ is_correct: true, correct_answer_id: 2, explanation: null, xp_earned: 10 });
    mockFetchOnce({
      session_id: 2, score: 1, total_questions: 1, xp_earned: 10, total_xp: 10, level: 1, streak: 1,
    });

    const onComplete = vi.fn();
    render(<QuizQuestion session={oneQuestionSession} onComplete={onComplete} />);

    fireEvent.click(screen.getByText("4"));
    await waitFor(() => screen.getByText("See results"));
    fireEvent.click(screen.getByText("See results"));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 2, score: 1 })
    ));

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/quiz-sessions/2/complete");
    expect(options.method).toBe("POST");
  });

  it("ignores clicks on a choice after one has already been selected", async () => {
    mockFetchOnce({ is_correct: true, correct_answer_id: 2, explanation: null, xp_earned: 10 });
    render(<QuizQuestion session={twoQuestionSession} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText("4"));
    await waitFor(() => screen.getByText(/Correct!/));
    fireEvent.click(screen.getByText("3")); // disabled, but click it anyway

    expect(fetch).toHaveBeenCalledTimes(1); // no second submit-answer call
  });
});
