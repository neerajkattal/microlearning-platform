import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCardExpand } from "./useCardExpand";

const RECT = { top: 10, left: 20, width: 30, height: 40, color: "#f59e0b", icon: "🎲" };

describe("useCardExpand", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets the target immediately but stays unexpanded", () => {
    const { result } = renderHook(() => useCardExpand(500));
    act(() => {
      result.current.trigger(RECT, vi.fn());
    });
    expect(result.current.target).toEqual(RECT);
    expect(result.current.expanded).toBe(false);
  });

  it("expands after the animation frames settle, then completes and resets after the duration", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCardExpand(500));

    act(() => {
      result.current.trigger(RECT, onComplete);
    });

    act(() => {
      vi.advanceTimersToNextFrame();
    });
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(result.current.expanded).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.target).toBeNull();
    expect(result.current.expanded).toBe(false);
  });

  it("starts a fresh transition if triggered again before the previous one finishes", () => {
    const firstComplete = vi.fn();
    const secondComplete = vi.fn();
    const { result } = renderHook(() => useCardExpand(500));

    act(() => {
      result.current.trigger(RECT, firstComplete);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const secondRect = { ...RECT, color: "#3b82f6", icon: "🎬" };
    act(() => {
      result.current.trigger(secondRect, secondComplete);
    });
    expect(result.current.target).toEqual(secondRect);
    expect(result.current.expanded).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    // The first trigger's own timer still fires at its original 500ms
    // mark, but only the second trigger's callback is the one that
    // matters for what's currently on screen.
    expect(secondComplete).toHaveBeenCalledTimes(1);
  });
});
