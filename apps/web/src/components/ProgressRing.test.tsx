import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

function progressCircle(container: HTMLElement) {
  return container.querySelectorAll("circle")[1] as SVGCircleElement;
}

describe("ProgressRing", () => {
  afterEach(cleanup);

  it("renders a full ring (no offset) at 100%", () => {
    const { container } = render(<ProgressRing percent={100} size={64} strokeWidth={6} />);
    const circle = progressCircle(container);
    expect(circle.getAttribute("stroke-dashoffset")).toBe("0");
  });

  it("renders an empty ring (offset = circumference) at 0%", () => {
    const { container } = render(<ProgressRing percent={0} size={64} strokeWidth={6} />);
    const circle = progressCircle(container);
    const circumference = 2 * Math.PI * ((64 - 6) / 2);
    expect(Number(circle.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference, 5);
  });

  it("clamps values above 100", () => {
    const { container } = render(<ProgressRing percent={150} size={64} strokeWidth={6} />);
    const circle = progressCircle(container);
    expect(circle.getAttribute("stroke-dashoffset")).toBe("0");
  });

  it("clamps negative values to 0%", () => {
    const { container } = render(<ProgressRing percent={-20} size={64} strokeWidth={6} />);
    const circle = progressCircle(container);
    const circumference = 2 * Math.PI * ((64 - 6) / 2);
    expect(Number(circle.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference, 5);
  });

  it("renders children centered inside the ring", () => {
    const { getByText } = render(
      <ProgressRing percent={50}>
        <span>5</span>
      </ProgressRing>
    );
    expect(getByText("5")).toBeTruthy();
  });
});
