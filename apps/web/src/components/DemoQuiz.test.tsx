import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoQuiz } from "./DemoQuiz";

describe("DemoQuiz", () => {
  afterEach(cleanup);

  it("shows the first question and no feedback yet", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);
    expect(screen.getByText("Which planet is known as the Red Planet?")).toBeTruthy();
    expect(screen.getByText("Question 1/3")).toBeTruthy();
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();
  });

  it("awards demo XP for a correct answer and shows Next", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);
    fireEvent.click(screen.getByText("Mars"));
    expect(screen.getByText("⚡ 10 XP")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("does not award XP for a wrong answer", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);
    fireEvent.click(screen.getByText("Venus"));
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();
  });

  it("ignores a second click after one answer is already selected", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);
    fireEvent.click(screen.getByText("Mars"));
    fireEvent.click(screen.getByText("Venus")); // should no-op, already answered
    expect(screen.getByText("⚡ 10 XP")).toBeTruthy();
  });

  it("advances through all 3 questions and shows the finished summary", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);

    fireEvent.click(screen.getByText("Mars"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("What's the largest ocean on Earth?")).toBeTruthy();

    fireEvent.click(screen.getByText("Pacific"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Question 3/3")).toBeTruthy();

    fireEvent.click(screen.getByText("Experience Points"));
    expect(screen.getByText("See results →")).toBeTruthy();
    fireEvent.click(screen.getByText("See results →"));

    expect(screen.getByText("Demo complete — 3/3 correct, 30 XP")).toBeTruthy();
  });

  it("calls onCreateAccount when 'Create free account' is clicked from the summary", () => {
    const onCreateAccount = vi.fn();
    render(<DemoQuiz onCreateAccount={onCreateAccount} />);
    fireEvent.click(screen.getByText("Mars"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Pacific"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Extra Power")); // wrong, on purpose
    fireEvent.click(screen.getByText("See results →"));

    fireEvent.click(screen.getByText("Create free account"));
    expect(onCreateAccount).toHaveBeenCalled();
  });

  it("resets everything when Play again is clicked", () => {
    render(<DemoQuiz onCreateAccount={vi.fn()} />);
    fireEvent.click(screen.getByText("Mars"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Pacific"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Experience Points"));
    fireEvent.click(screen.getByText("See results →"));

    fireEvent.click(screen.getByText("Play again"));

    expect(screen.getByText("Which planet is known as the Red Planet?")).toBeTruthy();
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();
  });
});
