import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuizOptionsPage } from "./QuizOptionsPage";

const baseProps = { categoryName: "Geography", color: "#a855f7", icon: "🌍" };

describe("QuizOptionsPage", () => {
  afterEach(cleanup);

  it("shows the category name and icon", () => {
    render(<QuizOptionsPage {...baseProps} onStart={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Geography")).toBeTruthy();
    // Appears twice - once in the icon badge, once in the decorative
    // CategoryBackdrop watermark.
    expect(screen.getAllByText("🌍").length).toBeGreaterThan(0);
  });

  it("defaults to 'Any' difficulty and 5 questions, and calls onStart with them", () => {
    const onStart = vi.fn();
    render(<QuizOptionsPage {...baseProps} onStart={onStart} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onStart).toHaveBeenCalledWith(null, 5);
  });

  it("passes the selected difficulty and question count", () => {
    const onStart = vi.fn();
    render(<QuizOptionsPage {...baseProps} onStart={onStart} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByText("Continue"));
    expect(onStart).toHaveBeenCalledWith("hard", 15);
  });

  it("calls onBack when the top back link is clicked", () => {
    const onBack = vi.fn();
    render(<QuizOptionsPage {...baseProps} onStart={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("calls onBack when the Back button is clicked", () => {
    const onBack = vi.fn();
    render(<QuizOptionsPage {...baseProps} onStart={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
