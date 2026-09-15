import { useState } from "react";
import { accentHexFor } from "../accentColors";
import { categoryIcon } from "../categoryIcons";
import { CategoryTile } from "./CategoryTile";
import type { Category } from "../types";

interface CategoryRowProps {
  label: string;
  categories: Category[];
  onSelect: (category: Category, e: React.MouseEvent<HTMLButtonElement>) => void;
}

// A themed group of categories (e.g. "🎬 Entertainment") shown as an
// auto-scrolling row of big rectangular tiles by default - "See more"
// swaps it for the full static grid, since a scrolling row alone would
// permanently hide whatever isn't currently passing by.
export function CategoryRow({ label, categories, onSelect }: CategoryRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  // Scales with how many cards there are so a longer row doesn't zip
  // by any faster - slow enough to actually read a title.
  const durationSeconds = categories.length * 4;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400">{label}</h3>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
        >
          {expanded ? "Show less ↑" : "See more →"}
        </button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((category, index) => (
            <button
              key={category.id}
              onClick={(e) => onSelect(category, e)}
              disabled={category.question_count === 0}
              style={{ animationDelay: `${Math.min(index * 15, 300)}ms` }}
              className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60
                p-4 text-left shadow-card hover:border-violet-500/50 hover:shadow-glow hover:-translate-y-0.5
                hover:scale-[1.02] transition-all motion-safe:animate-card-in
                disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:scale-100
                disabled:hover:border-slate-800 disabled:hover:shadow-card"
            >
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: accentHexFor(category.id) }}
              />
              <div className="text-2xl mb-1" aria-hidden>
                {categoryIcon(category.name)}
              </div>
              <div className="font-semibold text-slate-100">{category.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5">
                  {category.question_count} questions
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // -my-3 cancels out py-3 in the flow (so this doesn't push later
        // content down) while still giving overflow-hidden's clip
        // boundary some vertical room to spare - without it, a hovered
        // tile's lift-and-scale grows past the row's own height and
        // gets its top edge clipped off.
        <div className="-my-3 py-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          <div
            className="flex gap-3 w-max motion-safe:animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {[...categories, ...categories].map((category, i) => (
              <CategoryTile
                key={`${category.id}-${i}`}
                category={category}
                onClick={(e) => onSelect(category, e)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
