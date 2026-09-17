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

  // Setting every photo's backgroundImage upfront meant the page had to
  // fetch all of them before it felt loaded - only the current photo and
  // the one it's about to fade into should ever load eagerly.
  function backgroundImages(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll("[aria-hidden] > div"))
      .slice(0, HERO_PHOTOS.length)
      .map((el) => (el as HTMLElement).style.backgroundImage);
  }

  it("only loads the first photo and the next one on mount, not all of them", () => {
    const { container } = render(<HeroBackdrop />);
    const images = backgroundImages(container);
    expect(images[0]).not.toBe("");
    expect(images[1]).not.toBe("");
    expect(images.slice(2)).toEqual(Array(HERO_PHOTOS.length - 2).fill(""));
  });

  it("preloads the next photo one rotation ahead as it advances", () => {
    const { container } = render(<HeroBackdrop />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // now showing photo 1; photo 2 should already be loading for the
    // rotation after this one
    expect(backgroundImages(container)[2]).not.toBe("");
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
