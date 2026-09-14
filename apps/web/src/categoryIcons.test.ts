import { describe, expect, it } from "vitest";
import { categoryIcon } from "./categoryIcons";

describe("categoryIcon", () => {
  it("matches known category names exactly, case-insensitively", () => {
    expect(categoryIcon("Geography")).toBe("🌍");
    expect(categoryIcon("geography")).toBe("🌍");
    expect(categoryIcon("Entertainment: Video Games")).toBe("🎮");
  });

  it("falls back to a keyword match for an unrecognized but similar name", () => {
    expect(categoryIcon("Entertainment: Anime Movies")).toBe("🎬");
  });

  it("falls back to the default icon for something wholly unrecognized", () => {
    expect(categoryIcon("Completely Unknown Topic")).toBe("❔");
  });
});
