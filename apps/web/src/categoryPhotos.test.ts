import { describe, expect, it } from "vitest";
import { categoryPhoto } from "./categoryPhotos";

describe("categoryPhoto", () => {
  it("matches known category names exactly, case-insensitively", () => {
    expect(categoryPhoto("History")).toContain("Colosseo");
    expect(categoryPhoto("history")).toContain("Colosseo");
    expect(categoryPhoto("Geography")).toContain("Blue_Marble");
  });

  it("falls back to a keyword match for an unrecognized but similar name", () => {
    expect(categoryPhoto("Entertainment: Anime Movies")).toContain("cinema");
  });

  it("falls back to the default photo for something wholly unrecognized", () => {
    expect(categoryPhoto("Completely Unknown Topic")).toBe(categoryPhoto("General Knowledge"));
  });

  it("returns a real https URL for every mapped category", () => {
    const names = [
      "General Knowledge",
      "Entertainment: Books",
      "Entertainment: Film",
      "Entertainment: Music",
      "Entertainment: Musicals & Theatres",
      "Entertainment: Television",
      "Entertainment: Video Games",
      "Entertainment: Board Games",
      "Entertainment: Comics",
      "Entertainment: Japanese Anime & Manga",
      "Entertainment: Cartoon & Animations",
      "Science & Nature",
      "Science: Computers",
      "Science: Mathematics",
      "Science: Gadgets",
      "Mythology",
      "Sports",
      "Geography",
      "History",
      "Art",
      "Celebrities",
      "Animals",
      "Vehicles",
    ];
    for (const name of names) {
      expect(categoryPhoto(name)).toMatch(/^https:\/\//);
    }
  });
});
