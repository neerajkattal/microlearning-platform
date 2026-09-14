import { describe, expect, it } from "vitest";
import { ACCENT_HEX, accentHexFor } from "./accentColors";

describe("accentHexFor", () => {
  it("gives the same category id the same color every time", () => {
    expect(accentHexFor(7)).toBe(accentHexFor(7));
  });

  it("cycles through the palette by id", () => {
    expect(accentHexFor(0)).toBe(ACCENT_HEX[0]);
    expect(accentHexFor(ACCENT_HEX.length)).toBe(ACCENT_HEX[0]);
    expect(accentHexFor(ACCENT_HEX.length + 1)).toBe(ACCENT_HEX[1]);
  });
});
