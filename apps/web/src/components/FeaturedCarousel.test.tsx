import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeaturedCarousel } from "./FeaturedCarousel";
import type { Category } from "../types";

const categories: Category[] = [
  { id: 1, name: "Geography", slug: "geography", question_count: 69 },
  { id: 2, name: "Entertainment: Film", slug: "film", question_count: 57 },
];

function stubPointer(isTouch: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: isTouch,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe("FeaturedCarousel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders nothing when there are no featured categories", () => {
    const { container } = render(<FeaturedCarousel categories={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onSelect with the clicked category on a non-touch device", () => {
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

  it("opens a full-screen preview instead of selecting immediately on a touch device", () => {
    stubPointer(true);
    const onSelect = vi.fn();
    render(<FeaturedCarousel categories={categories} onSelect={onSelect} />);
    const [geographyButton] = screen.getAllByRole("button", { name: /Geography/ });
    fireEvent.click(geographyButton);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Play Now")).toBeTruthy();
  });

  it("closes the touch preview without selecting when X is clicked", () => {
    stubPointer(true);
    const onSelect = vi.fn();
    render(<FeaturedCarousel categories={categories} onSelect={onSelect} />);
    const [geographyButton] = screen.getAllByRole("button", { name: /Geography/ });
    fireEvent.click(geographyButton);
    fireEvent.click(screen.getByLabelText("Close"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByText("Play Now")).toBeNull();
  });

  it("selects and closes the touch preview when Play Now is pressed", () => {
    stubPointer(true);
    const onSelect = vi.fn();
    render(<FeaturedCarousel categories={categories} onSelect={onSelect} />);
    const [geographyButton] = screen.getAllByRole("button", { name: /Geography/ });
    fireEvent.click(geographyButton);
    fireEvent.click(screen.getByText("Play Now"));

    expect(onSelect).toHaveBeenCalledWith(categories[0], expect.anything());
    expect(screen.queryByText("Play Now")).toBeNull();
  });
});
