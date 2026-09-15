import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameModeSelect } from "./GameModeSelect";

const baseProps = { categoryName: "Geography", color: "#a855f7", icon: "🌍" };

describe("GameModeSelect", () => {
  afterEach(cleanup);

  it("shows the category context", () => {
    render(<GameModeSelect {...baseProps} onSelectMode={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Geography")).toBeTruthy();
  });

  it("calls onSelectMode with 'classic' when Classic is picked", () => {
    const onSelectMode = vi.fn();
    render(<GameModeSelect {...baseProps} onSelectMode={onSelectMode} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Classic"));
    expect(onSelectMode).toHaveBeenCalledWith("classic");
  });

  it("calls onSelectMode with 'lane-rush' when Lane Rush is picked", () => {
    const onSelectMode = vi.fn();
    render(<GameModeSelect {...baseProps} onSelectMode={onSelectMode} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Lane Rush"));
    expect(onSelectMode).toHaveBeenCalledWith("lane-rush");
  });

  it("calls onSelectMode with 'balloon-pop' when Balloon Pop is picked", () => {
    const onSelectMode = vi.fn();
    render(<GameModeSelect {...baseProps} onSelectMode={onSelectMode} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Balloon Pop"));
    expect(onSelectMode).toHaveBeenCalledWith("balloon-pop");
  });

  it("calls onBack when the back link is clicked", () => {
    const onBack = vi.fn();
    render(<GameModeSelect {...baseProps} onSelectMode={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
