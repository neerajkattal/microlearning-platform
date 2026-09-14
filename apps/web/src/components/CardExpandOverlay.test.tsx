import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardExpandOverlay } from "./CardExpandOverlay";

const TARGET = { top: 10, left: 20, width: 30, height: 40, color: "#f59e0b", icon: "🎲" };

describe("CardExpandOverlay", () => {
  afterEach(cleanup);

  it("renders nothing when there's no target", () => {
    const { container } = render(<CardExpandOverlay target={null} expanded={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("sizes itself to the card's rect when not expanded", () => {
    const { container } = render(<CardExpandOverlay target={TARGET} expanded={false} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.top).toBe("10px");
    expect(el.style.left).toBe("20px");
    expect(el.style.width).toBe("30px");
    expect(el.style.height).toBe("40px");
  });

  it("fills the viewport when expanded", () => {
    const { container } = render(<CardExpandOverlay target={TARGET} expanded={true} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.top).toBe("0px");
    expect(el.style.left).toBe("0px");
    expect(el.style.width).toBe("100vw");
    expect(el.style.height).toBe("100vh");
  });
});
