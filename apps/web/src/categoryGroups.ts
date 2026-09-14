// Groups categories into themed sections for the home screen, the same
// way exact-name lookup + fallback works in categoryIcons.ts - covers
// every category OpenTDB actually returns, with a keyword fallback so
// an unrecognized future category name still lands somewhere sensible
// instead of being silently dropped.
export interface CategoryGroup {
  label: string;
}

const GROUPS = {
  entertainment: { label: "🎬 Entertainment" },
  science: { label: "🔬 Science" },
  world: { label: "🌍 World" },
  more: { label: "🎯 More" },
} as const;

type GroupKey = keyof typeof GROUPS;

const EXACT: Record<string, GroupKey> = {
  "entertainment: books": "entertainment",
  "entertainment: film": "entertainment",
  "entertainment: music": "entertainment",
  "entertainment: musicals & theatres": "entertainment",
  "entertainment: television": "entertainment",
  "entertainment: video games": "entertainment",
  "entertainment: board games": "entertainment",
  "entertainment: comics": "entertainment",
  "entertainment: japanese anime & manga": "entertainment",
  "entertainment: cartoon & animations": "entertainment",
  "science & nature": "science",
  "science: computers": "science",
  "science: mathematics": "science",
  "science: gadgets": "science",
  geography: "world",
  history: "world",
  politics: "world",
  mythology: "world",
  "general knowledge": "more",
  art: "more",
  celebrities: "more",
  animals: "more",
  vehicles: "more",
  sports: "more",
};

const KEYWORDS: [RegExp, GroupKey][] = [
  [/entertainment/i, "entertainment"],
  [/science/i, "science"],
  [/geograph|histor|politic|mytholog/i, "world"],
];

const GROUP_ORDER: GroupKey[] = ["entertainment", "science", "world", "more"];

function groupKeyFor(name: string): GroupKey {
  const exact = EXACT[name.trim().toLowerCase()];
  if (exact) return exact;
  const keywordMatch = KEYWORDS.find(([pattern]) => pattern.test(name));
  return keywordMatch ? keywordMatch[1] : "more";
}

export function groupLabelFor(name: string): string {
  return GROUPS[groupKeyFor(name)].label;
}

/** Groups items by category name into an ordered list of
 * (label, items) sections - entertainment/science/world/more, in that
 * order, omitting any section with nothing in it. */
export function groupByCategory<T>(items: T[], nameOf: (item: T) => string): [string, T[]][] {
  const byGroup = new Map<GroupKey, T[]>();
  for (const item of items) {
    const key = groupKeyFor(nameOf(item));
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(item);
    else byGroup.set(key, [item]);
  }
  return GROUP_ORDER.filter((key) => byGroup.has(key)).map((key) => [GROUPS[key].label, byGroup.get(key)!]);
}
