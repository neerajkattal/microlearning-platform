import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultsScreen } from "./ResultsScreen";
import type { CompleteSessionResult } from "../types";

const result: CompleteSessionResult = {
  session_id: 1,
  score: 4,
  total_questions: 5,
  xp_earned: 42,
  total_xp: 142,
  level: 2,
  streak: 3,
  achievements_earned: [],
  review: [
    { question_id: 1, prompt: "2 + 2?", your_answer: "4", correct_answer: "4", is_correct: true },
    { question_id: 2, prompt: "Capital of France?", your_answer: "Berlin", correct_answer: "Paris", is_correct: false },
  ],
};

describe("ResultsScreen", () => {
  afterEach(cleanup);

  it("renders the score and XP/level/streak breakdown", () => {
    render(<ResultsScreen result={result} onPlayAgain={vi.fn()} onBackToCategories={vi.fn()} />);

    expect(screen.getByText("4 / 5 correct")).toBeTruthy();
    expect(screen.getByText("+42 XP")).toBeTruthy();
    expect(screen.getByText("Total XP: 142")).toBeTruthy();
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getByText("Streak: 3 day(s)")).toBeTruthy();
  });

  it("calls onPlayAgain when clicked", () => {
    const onPlayAgain = vi.fn();
    render(<ResultsScreen result={result} onPlayAgain={onPlayAgain} onBackToCategories={vi.fn()} />);
    fireEvent.click(screen.getByText("Play again"));
    expect(onPlayAgain).toHaveBeenCalled();
  });

  it("calls onBackToCategories when clicked", () => {
    const onBack = vi.fn();
    render(<ResultsScreen result={result} onPlayAgain={vi.fn()} onBackToCategories={onBack} />);
    fireEvent.click(screen.getByText("Back to categories"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows newly earned achievements when present", () => {
    const withAchievement: CompleteSessionResult = {
      ...result,
      achievements_earned: [
        { code: "first_win", name: "First Win", description: "Answer one correctly.", icon: "🎯" },
      ],
    };
    render(<ResultsScreen result={withAchievement} onPlayAgain={vi.fn()} onBackToCategories={vi.fn()} />);
    expect(screen.getByText("Achievement unlocked!")).toBeTruthy();
    expect(screen.getByText(/First Win/)).toBeTruthy();
  });

  it("shows no achievement banner when none were earned", () => {
    render(<ResultsScreen result={result} onPlayAgain={vi.fn()} onBackToCategories={vi.fn()} />);
    expect(screen.queryByText("Achievement unlocked!")).toBeNull();
  });

  it("shows a per-question review with the chosen and correct answers", () => {
    render(<ResultsScreen result={result} onPlayAgain={vi.fn()} onBackToCategories={vi.fn()} />);
    expect(screen.getByText("Capital of France?")).toBeTruthy();
    expect(screen.getByText("Berlin")).toBeTruthy();
    // "Paris" appears as the correct answer only for the wrong question,
    // since the right one doesn't render a separate "Correct answer" line.
    expect(screen.getByText("Paris")).toBeTruthy();
  });

  it("shows 'No answer' for a question that was never answered", () => {
    const withUnanswered: CompleteSessionResult = {
      ...result,
      review: [
        { question_id: 3, prompt: "Unanswered one?", your_answer: null, correct_answer: "X", is_correct: false },
      ],
    };
    render(<ResultsScreen result={withUnanswered} onPlayAgain={vi.fn()} onBackToCategories={vi.fn()} />);
    expect(screen.getByText("No answer")).toBeTruthy();
  });
});
