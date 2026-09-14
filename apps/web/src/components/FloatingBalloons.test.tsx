import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingBalloons } from "./FloatingBalloons";

describe("FloatingBalloons", () => {
  afterEach(cleanup);

  it("renders as a decorative, non-interactive layer", () => {
    const { container } = render(<FloatingBalloons />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("pointer-events-none");
  });

  it("renders a handful of balloon elements", () => {
    const { container } = render(<FloatingBalloons />);
    expect(container.querySelectorAll("span").length).toBeGreaterThan(0);
  });
});
