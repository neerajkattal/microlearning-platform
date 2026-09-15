import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryTile } from "./CategoryTile";
import type { Category } from "../types";

const category: Category = { id: 1, name: "Geography", slug: "geography", question_count: 69 };

describe("CategoryTile", () => {
  afterEach(cleanup);

  it("shows the category name and question count", () => {
    render(<CategoryTile category={category} onClick={vi.fn()} />);
    expect(screen.getByText("Geography")).toBeTruthy();
    expect(screen.getByText("69 questions")).toBeTruthy();
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<CategoryTile category={category} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Geography/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it("is disabled when there are no questions", () => {
    const empty: Category = { id: 2, name: "Empty", slug: "empty", question_count: 0 };
    render(<CategoryTile category={empty} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Empty/ })).toHaveProperty("disabled", true);
  });
});
