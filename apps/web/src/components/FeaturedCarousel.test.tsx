import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeaturedCarousel } from "./FeaturedCarousel";
import type { Category } from "../types";

const categories: Category[] = [
  { id: 1, name: "Geography", slug: "geography", question_count: 69 },
  { id: 2, name: "Entertainment: Film", slug: "film", question_count: 57 },
];

describe("FeaturedCarousel", () => {
  afterEach(cleanup);

  it("renders nothing when there are no featured categories", () => {
    const { container } = render(<FeaturedCarousel categories={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the first category's info panel by default", () => {
    render(<FeaturedCarousel categories={categories} onSelect={vi.fn()} />);
    expect(screen.getByText("🎯 69 questions available")).toBeTruthy();
  });

  it("switches the info panel to whichever card is hovered", () => {
    render(<FeaturedCarousel categories={categories} onSelect={vi.fn()} />);
    const [filmButton] = screen.getAllByRole("button", { name: /Entertainment: Film/ });
    fireEvent.mouseEnter(filmButton);
    expect(screen.getByText("🎯 57 questions available")).toBeTruthy();
  });

  it("reverts to the default info panel when the mouse leaves", () => {
    render(<FeaturedCarousel categories={categories} onSelect={vi.fn()} />);
    const [filmButton] = screen.getAllByRole("button", { name: /Entertainment: Film/ });
    fireEvent.mouseEnter(filmButton);
    fireEvent.mouseLeave(filmButton);
    expect(screen.getByText("🎯 69 questions available")).toBeTruthy();
  });

  it("calls onSelect with the clicked category", () => {
    const onSelect = vi.fn();
    render(<FeaturedCarousel categories={categories} onSelect={onSelect} />);
    const [geographyButton] = screen.getAllByRole("button", { name: /Geography/ });
    fireEvent.click(geographyButton);
    expect(onSelect).toHaveBeenCalledWith(categories[0], expect.anything());
  });

  it("duplicates the list for a seamless marquee loop", () => {
    render(<FeaturedCarousel categories={categories} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /Geography/ }).length).toBe(2);
  });
});
