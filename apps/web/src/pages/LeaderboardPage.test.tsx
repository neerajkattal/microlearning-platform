import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";
import { api } from "../api";

describe("LeaderboardPage", () => {
  afterEach(cleanup);

  it("renders entries in the order the API returns them", async () => {
    vi.spyOn(api, "getLeaderboard").mockResolvedValue([
      { username: "high_scorer", xp: 500, level: 5 },
      { username: "mid_scorer", xp: 100, level: 2 },
    ]);

    render(<LeaderboardPage onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("high_scorer")).toBeTruthy());
    expect(screen.getByText("mid_scorer")).toBeTruthy();
    expect(screen.getByText("500 XP · Level 5")).toBeTruthy();
  });

  it("shows a message when there are no players yet", async () => {
    vi.spyOn(api, "getLeaderboard").mockResolvedValue([]);
    render(<LeaderboardPage onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("No players yet.")).toBeTruthy());
  });

  it("shows an error state when the request fails", async () => {
    vi.spyOn(api, "getLeaderboard").mockRejectedValue(new Error("500"));
    render(<LeaderboardPage onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the leaderboard/)).toBeTruthy());
  });

  it("calls onBack when the back button is clicked", () => {
    vi.spyOn(api, "getLeaderboard").mockResolvedValue([]);
    const onBack = vi.fn();
    render(<LeaderboardPage onBack={onBack} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
