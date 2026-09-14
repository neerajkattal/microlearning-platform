// Mirrors services/api/app/avatars.py's AVATAR_KEYS - kept in sync by
// hand (see that file's own comment on why: no shared-types package
// crosses the Python/TypeScript boundary in this monorepo). The backend
// only ever sees/validates the key; this file owns the actual glyph.
export const AVATAR_OPTIONS: { key: string; emoji: string; label: string }[] = [
  { key: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
  { key: "hero", emoji: "🦸", label: "Hero" },
  { key: "wizard", emoji: "🧙", label: "Wizard" },
  { key: "robot", emoji: "🤖", label: "Robot" },
  { key: "cat", emoji: "🐱", label: "Cat" },
  { key: "fox", emoji: "🦊", label: "Fox" },
  { key: "dragon", emoji: "🐉", label: "Dragon" },
  { key: "alien", emoji: "👽", label: "Alien" },
  { key: "ninja", emoji: "🥷", label: "Ninja" },
  { key: "vampire", emoji: "🧛", label: "Vampire" },
  { key: "lion", emoji: "🦁", label: "Lion" },
  { key: "panda", emoji: "🐼", label: "Panda" },
];

const BY_KEY = new Map(AVATAR_OPTIONS.map((option) => [option.key, option]));

export function avatarEmoji(key: string | null | undefined): string {
  return (key && BY_KEY.get(key)?.emoji) || "🧑‍🚀";
}
