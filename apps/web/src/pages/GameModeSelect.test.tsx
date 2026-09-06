import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameModeSelect } from "./GameModeSelect";

describe("GameModeSelect", () => {
  afterEach(cleanup);

  it("calls onSelectMode with 'classic' when Classic is picked", () => {
    const onSelectMode = vi.fn();
    render(<GameModeSelect onSelectMode={onSelectMode} />);
    fireEvent.click(screen.getByText("Classic"));
    expect(onSelectMode).toHaveBeenCalledWith("classic");
  });

  it("calls onSelectMode with 'lane-rush' when Lane Rush is picked", () => {
    const onSelectMode = vi.fn();
    render(<GameModeSelect onSelectMode={onSelectMode} />);
    fireEvent.click(screen.getByText("Lane Rush"));
    expect(onSelectMode).toHaveBeenCalledWith("lane-rush");
  });
});
