import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryRow } from "./CategoryRow";
import type { Category } from "../types";

const categories: Category[] = [
  { id: 1, name: "Geography", slug: "geography", question_count: 69 },
  { id: 2, name: "Entertainment: Film", slug: "film", question_count: 57 },
];

describe("CategoryRow", () => {
  afterEach(cleanup);

  it("renders nothing for an empty group", () => {
    const { container } = render(<CategoryRow label="Empty" categories={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the scrolling row (duplicated for a seamless loop) by default", () => {
    render(<CategoryRow label="🌍 World" categories={categories} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /Geography/ }).length).toBe(2);
  });

  it("calls onSelect with the clicked category from the row", () => {
    const onSelect = vi.fn();
    render(<CategoryRow label="🌍 World" categories={categories} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Geography/ })[0]);
    expect(onSelect).toHaveBeenCalledWith(categories[0], expect.anything());
  });

  it("switches to the full static grid when 'See more' is clicked", () => {
    render(<CategoryRow label="🌍 World" categories={categories} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText("See more →"));

    // No longer duplicated - exactly one of each category now.
    expect(screen.getAllByRole("button", { name: /Geography/ }).length).toBe(1);
    expect(screen.getByText("Show less ↑")).toBeTruthy();
  });

  it("switches back to the scrolling row when 'Show less' is clicked", () => {
    render(<CategoryRow label="🌍 World" categories={categories} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText("See more →"));
    fireEvent.click(screen.getByText("Show less ↑"));

    expect(screen.getAllByRole("button", { name: /Geography/ }).length).toBe(2);
  });
});
