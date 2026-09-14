import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsPage } from "./StatsPage";
import { api } from "../api";

describe("StatsPage", () => {
  afterEach(cleanup);

  it("shows a loading state, then stats and achievements once loaded", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({
      user: { id: 1, username: "alice", avatar: "astronaut" },
      stats: { xp: 120, level: 2, current_streak: 3, longest_streak: 5 },
      achievements: [
        { code: "first_win", name: "First Win", description: "Answer one correctly.", icon: "🎯" },
      ],
    });

    render(<StatsPage onBack={vi.fn()} />);
    expect(screen.getByText("Loading your stats...")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("alice")).toBeTruthy());
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("First Win")).toBeTruthy();
  });

  it("shows a message when there are no achievements yet", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({
      user: { id: 1, username: "bob", avatar: "astronaut" },
      stats: { xp: 0, level: 1, current_streak: 0, longest_streak: 0 },
      achievements: [],
    });

    render(<StatsPage onBack={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("None yet — play a quiz to start earning some.")).toBeTruthy()
    );
  });

  it("shows an error state when the request fails", async () => {
    vi.spyOn(api, "getMe").mockRejectedValue(new Error("500"));
    render(<StatsPage onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Couldn't load your stats/)).toBeTruthy());
  });

  it("calls onBack when the back button is clicked", () => {
    vi.spyOn(api, "getMe").mockResolvedValue({
      user: { id: 1, username: "carol", avatar: "astronaut" },
      stats: { xp: 0, level: 1, current_streak: 0, longest_streak: 0 },
      achievements: [],
    });
    const onBack = vi.fn();
    render(<StatsPage onBack={onBack} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
