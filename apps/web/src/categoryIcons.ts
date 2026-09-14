// Maps a category's display name to an icon. Exact matches cover every
// category OpenTDB actually provides (see docs/learning or the live
// /categories endpoint); the keyword fallback below keeps things sane if
// a new source ever introduces a category name we haven't seen, rather
// than silently showing nothing.
const EXACT: Record<string, string> = {
  "general knowledge": "🧠",
  "entertainment: books": "📚",
  "entertainment: film": "🎬",
  "entertainment: music": "🎵",
  "entertainment: musicals & theatres": "🎭",
  "entertainment: television": "📺",
  "entertainment: video games": "🎮",
  "entertainment: board games": "🎯",
  "entertainment: comics": "🦸",
  "entertainment: japanese anime & manga": "⛩️",
  "entertainment: cartoon & animations": "🖍️",
  "science & nature": "🌿",
  "science: computers": "💻",
  "science: mathematics": "➗",
  "science: gadgets": "🔧",
  mythology: "🔱",
  sports: "⚽",
  geography: "🌍",
  history: "📜",
  politics: "🏛️",
  art: "🎨",
  celebrities: "⭐",
  animals: "🐾",
  vehicles: "🚗",
};

const KEYWORDS: [RegExp, string][] = [
  [/film|movie/i, "🎬"],
  [/music/i, "🎵"],
  [/book/i, "📚"],
  [/tv|television/i, "📺"],
  [/game/i, "🎮"],
  [/science/i, "🔬"],
  [/sport/i, "⚽"],
  [/geograph/i, "🌍"],
  [/histor/i, "📜"],
  [/art/i, "🎨"],
  [/animal/i, "🐾"],
  [/vehicle|car/i, "🚗"],
];

const DEFAULT_ICON = "❔";

export function categoryIcon(name: string): string {
  const exact = EXACT[name.trim().toLowerCase()];
  if (exact) return exact;
  const keywordMatch = KEYWORDS.find(([pattern]) => pattern.test(name));
  return keywordMatch ? keywordMatch[1] : DEFAULT_ICON;
}
