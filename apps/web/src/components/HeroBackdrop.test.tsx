import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroBackdrop } from "./HeroBackdrop";
import { HERO_PHOTOS } from "../categoryPhotos";

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe("HeroBackdrop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  // Only the photo layers (one per HERO_PHOTOS entry) - excludes the
  // trailing scrim div, which has no opacity style of its own.
  function layerOpacities(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll("[aria-hidden] > div"))
      .slice(0, HERO_PHOTOS.length)
      .map((el) => (el as HTMLElement).style.opacity);
  }

  it("starts with only the first photo visible", () => {
    const { container } = render(<HeroBackdrop />);
    const opacities = layerOpacities(container);
    expect(opacities[0]).not.toBe("0");
    expect(opacities.slice(1, HERO_PHOTOS.length)).toEqual(Array(HERO_PHOTOS.length - 1).fill("0"));
  });

  it("crossfades to the next photo after the rotation interval", () => {
    const { container } = render(<HeroBackdrop />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    const opacities = layerOpacities(container);
    expect(opacities[0]).toBe("0");
    expect(opacities[1]).not.toBe("0");
  });

  it("wraps back to the first photo after cycling through all of them", () => {
    const { container } = render(<HeroBackdrop />);
    act(() => {
      vi.advanceTimersByTime(4000 * HERO_PHOTOS.length);
    });
    const opacities = layerOpacities(container);
    expect(opacities[0]).not.toBe("0");
  });

  it("stays on the first photo when the viewer prefers reduced motion", () => {
    stubReducedMotion(true);
    const { container } = render(<HeroBackdrop />);
    act(() => {
      vi.advanceTimersByTime(4000 * 3);
    });
    const opacities = layerOpacities(container);
    expect(opacities[0]).not.toBe("0");
    expect(opacities.slice(1)).toEqual(Array(HERO_PHOTOS.length - 1).fill("0"));
  });
});
