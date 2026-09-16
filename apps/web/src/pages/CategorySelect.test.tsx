import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategorySelect } from "./CategorySelect";

function mockFetchOnce(body: unknown, ok = true) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  });
}

// The expand-transition delays the actual onSelectCategory call behind
// a couple of animation frames plus a fixed timeout (see
// useCardExpand.ts, tested there with fake timers) - real timers here
// confirm the whole wire-up actually fires end to end, not just that
// the hook's internal state machine is correct in isolation.
const EXPAND_TRANSITION_TIMEOUT = { timeout: 1500 };

describe("CategorySelect", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a loading state before categories arrive", () => {
    mockFetchOnce([]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);
    expect(screen.getByText("Loading categories...")).toBeTruthy();
  });

  it("renders fetched categories plus an 'any category' option", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Math").length).toBeGreaterThan(0));
    expect(screen.getByText("Any category")).toBeTruthy();
  });

  it("calls onSelectCategory with the slug when a category is clicked", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    const onSelect = vi.fn();
    render(<CategorySelect onSelectCategory={onSelect} />);

    await waitFor(() => screen.getAllByRole("button", { name: /Math/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /Math/ })[0]);

    await waitFor(
      () => expect(onSelect).toHaveBeenCalledWith("math", "Math", "#3b82f6", "❔"),
      EXPAND_TRANSITION_TIMEOUT
    );
  });

  it("calls onSelectCategory with null for 'any category'", async () => {
    mockFetchOnce([]);
    const onSelect = vi.fn();
    render(<CategorySelect onSelectCategory={onSelect} />);

    await waitFor(() => screen.getByText("Any category"));
    fireEvent.click(screen.getByText("Any category"));

    await waitFor(
      () => expect(onSelect).toHaveBeenCalledWith(null, "Any category", "#fb923c", "🎲"),
      EXPAND_TRANSITION_TIMEOUT
    );
  });

  it("disables categories with zero questions", async () => {
    mockFetchOnce([{ id: 1, name: "Empty", slug: "empty", question_count: 0 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Empty").length).toBeGreaterThan(0));
    const buttons = screen.getAllByRole("button", { name: /Empty/ });
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it("excludes zero-question categories from the featured carousel", async () => {
    mockFetchOnce([{ id: 1, name: "Empty", slug: "empty", question_count: 0 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    // Only ever reachable via its category row (duplicated for the
    // scrolling loop) - the featured carousel excludes it entirely, so
    // it never contributes a third/fourth copy.
    await waitFor(() => expect(screen.getAllByText("Empty").length).toBe(2));
  });

  it("shows an error message when the fetch fails", async () => {
    mockFetchOnce({}, false);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Couldn't load categories/)).toBeTruthy());
  });

  it("groups categories into themed sections", async () => {
    mockFetchOnce([
      { id: 1, name: "Geography", slug: "geography", question_count: 5 },
      { id: 2, name: "Entertainment: Film", slug: "film", question_count: 5 },
      { id: 3, name: "Art", slug: "art", question_count: 5 },
    ]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Geography").length).toBeGreaterThan(0));
    expect(screen.getByText("🎬 Entertainment")).toBeTruthy();
    expect(screen.getByText("🌍 World")).toBeTruthy();
    expect(screen.getByText("🎯 More")).toBeTruthy();
  });

  it("shows the stats banner once the user's stats load", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    mockFetchOnce({
      user: { id: 1, username: "alice" },
      stats: { xp: 250, level: 3, current_streak: 4, longest_streak: 6 },
      achievements: [],
    });
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Welcome back, alice")).toBeTruthy());
    expect(screen.getByText("50/100 XP to level 4")).toBeTruthy();
  });

  it("still renders categories fine if the stats fetch fails", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    mockFetchOnce({}, false);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Math").length).toBeGreaterThan(0));
    expect(screen.queryByText(/Welcome back/)).toBeNull();
  });

  it("filters the category grid as the user types a search", async () => {
    mockFetchOnce([
      { id: 1, name: "Geography", slug: "geography", question_count: 5 },
      { id: 2, name: "Math", slug: "math", question_count: 5 },
    ]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Geography").length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: "geo" } });

    expect(screen.getAllByText("Geography").length).toBeGreaterThan(0);
    expect(screen.queryByText("Math")).toBeNull();
  });

  it("shows a message when a search matches nothing", async () => {
    mockFetchOnce([{ id: 1, name: "Geography", slug: "geography", question_count: 5 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("Geography").length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: "zzz" } });

    expect(screen.getByText('No categories match "zzz".')).toBeTruthy();
  });

  it("hides the featured carousel and 'any category' option while searching", async () => {
    mockFetchOnce([{ id: 1, name: "Geography", slug: "geography", question_count: 5 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Any category")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Search categories"), { target: { value: "geo" } });

    expect(screen.queryByText("Any category")).toBeNull();
    expect(screen.queryByText("✨ Featured")).toBeNull();
  });
});
