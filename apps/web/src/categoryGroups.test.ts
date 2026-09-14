import { describe, expect, it } from "vitest";
import { groupByCategory, groupLabelFor } from "./categoryGroups";

describe("groupLabelFor", () => {
  it("matches known category names exactly", () => {
    expect(groupLabelFor("Entertainment: Video Games")).toBe("🎬 Entertainment");
    expect(groupLabelFor("Geography")).toBe("🌍 World");
    expect(groupLabelFor("Science: Computers")).toBe("🔬 Science");
  });

  it("falls back to a keyword match for an unrecognized but similar name", () => {
    expect(groupLabelFor("Entertainment: Anime Movies")).toBe("🎬 Entertainment");
  });

  it("falls back to 'More' for something wholly unrecognized", () => {
    expect(groupLabelFor("Completely Unknown Topic")).toBe("🎯 More");
  });
});

describe("groupByCategory", () => {
  it("groups items into ordered, non-empty sections", () => {
    const items = [
      { name: "Geography" },
      { name: "Entertainment: Film" },
      { name: "Art" },
      { name: "Science: Computers" },
    ];
    const grouped = groupByCategory(items, (item) => item.name);

    expect(grouped.map(([label]) => label)).toEqual(["🎬 Entertainment", "🔬 Science", "🌍 World", "🎯 More"]);
    expect(grouped[0][1]).toEqual([{ name: "Entertainment: Film" }]);
    expect(grouped[3][1]).toEqual([{ name: "Art" }]);
  });

  it("omits sections with nothing in them", () => {
    const items = [{ name: "Geography" }, { name: "History" }];
    const grouped = groupByCategory(items, (item) => item.name);
    expect(grouped).toEqual([["🌍 World", items]]);
  });

  it("returns an empty list for no items", () => {
    expect(groupByCategory([], (item: { name: string }) => item.name)).toEqual([]);
  });
});
