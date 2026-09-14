// Shared accent palette for category cards - both the real CSS color
// (for inline styles, like the card-expand overlay and hover glows,
// which can't use a Tailwind class name) and the matching Tailwind
// class (for anything that can just use a class).
export const ACCENT_HEX = ["#f59e0b", "#3b82f6", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4"];
export const ACCENT_CLASSES = [
  "bg-amber-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];

/** A stable color for a given category id - same category always gets
 * the same color, independent of its position in whatever list it's
 * currently rendered in (a grid index shifts as categories load; an id
 * doesn't). */
export function accentHexFor(id: number): string {
  return ACCENT_HEX[id % ACCENT_HEX.length];
}
