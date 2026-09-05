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
});
