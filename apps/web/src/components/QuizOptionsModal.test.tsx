import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuizOptionsModal } from "./QuizOptionsModal";

describe("QuizOptionsModal", () => {
  afterEach(cleanup);

  it("shows the category name", () => {
    render(<QuizOptionsModal categoryName="Geography" onStart={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Geography")).toBeTruthy();
  });

  it("defaults to 'Any' difficulty and 5 questions, and calls onStart with them", () => {
    const onStart = vi.fn();
    render(<QuizOptionsModal categoryName="Geography" onStart={onStart} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onStart).toHaveBeenCalledWith(null, 5);
  });

  it("passes the selected difficulty and question count", () => {
    const onStart = vi.fn();
    render(<QuizOptionsModal categoryName="Geography" onStart={onStart} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByText("Continue"));
    expect(onStart).toHaveBeenCalledWith("hard", 15);
  });

  it("calls onCancel when Back is clicked", () => {
    const onCancel = vi.fn();
    render(<QuizOptionsModal categoryName="Geography" onStart={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when the backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<QuizOptionsModal categoryName="Geography" onStart={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not call onCancel when clicking inside the dialog", () => {
    const onCancel = vi.fn();
    render(<QuizOptionsModal categoryName="Geography" onStart={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
