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

    await waitFor(() => expect(screen.getByText("Math")).toBeTruthy());
    expect(screen.getByText("Any category")).toBeTruthy();
  });

  it("calls onSelectCategory with the slug when a category is clicked", async () => {
    mockFetchOnce([{ id: 1, name: "Math", slug: "math", question_count: 3 }]);
    const onSelect = vi.fn();
    render(<CategorySelect onSelectCategory={onSelect} />);

    await waitFor(() => screen.getByText("Math"));
    fireEvent.click(screen.getByText("Math"));

    expect(onSelect).toHaveBeenCalledWith("math");
  });

  it("calls onSelectCategory with null for 'any category'", async () => {
    mockFetchOnce([]);
    const onSelect = vi.fn();
    render(<CategorySelect onSelectCategory={onSelect} />);

    await waitFor(() => screen.getByText("Any category"));
    fireEvent.click(screen.getByText("Any category"));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("disables categories with zero questions", async () => {
    mockFetchOnce([{ id: 1, name: "Empty", slug: "empty", question_count: 0 }]);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => screen.getByText("Empty"));
    const button = screen.getByText("Empty").closest("button");
    expect(button?.disabled).toBe(true);
  });

  it("shows an error message when the fetch fails", async () => {
    mockFetchOnce({}, false);
    render(<CategorySelect onSelectCategory={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Couldn't load categories/)).toBeTruthy());
  });
});
