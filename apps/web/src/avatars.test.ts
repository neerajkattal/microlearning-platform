import { describe, expect, it } from "vitest";
import { avatarEmoji } from "./avatars";

describe("avatarEmoji", () => {
  it("returns the matching emoji for a known key", () => {
    expect(avatarEmoji("robot")).toBe("🤖");
    expect(avatarEmoji("dragon")).toBe("🐉");
  });

  it("falls back to the default for an unknown or missing key", () => {
    expect(avatarEmoji("not-a-real-key")).toBe("🧑‍🚀");
    expect(avatarEmoji(null)).toBe("🧑‍🚀");
    expect(avatarEmoji(undefined)).toBe("🧑‍🚀");
  });
});
