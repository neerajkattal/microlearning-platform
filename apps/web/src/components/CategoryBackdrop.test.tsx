import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CategoryBackdrop } from "./CategoryBackdrop";
import { categoryPhoto } from "../categoryPhotos";

describe("CategoryBackdrop", () => {
  afterEach(cleanup);

  it("uses the category's real photo as the background image", () => {
    const { container } = render(<CategoryBackdrop categoryName="Geography" color="#a855f7" />);
    const photoLayer = container.querySelector("[style*='background-image']") as HTMLElement;
    expect(photoLayer.style.backgroundImage).toContain(categoryPhoto("Geography"));
  });

  it("is purely decorative and hidden from assistive tech", () => {
    const { container } = render(<CategoryBackdrop categoryName="Geography" color="#a855f7" />);
    expect(container.firstChild).toHaveProperty("ariaHidden", "true");
  });
});
