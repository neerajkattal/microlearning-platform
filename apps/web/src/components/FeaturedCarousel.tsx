import { useState } from "react";
import { categoryIcon } from "../categoryIcons";
import type { Category } from "../types";

// 10 base XP * the 2.0 "hard" multiplier + the 5 XP speed bonus + the
// max 10 XP streak bonus (services/api/app/quiz_engine/scoring.py) - a
// real number pulled from the actual formula, not a made-up one.
const MAX_XP_PER_QUESTION = 35;

interface FeaturedCarouselProps {
  categories: Category[];
  onSelect: (category: Category, e: React.MouseEvent<HTMLButtonElement>) => void;
}

function shortName(name: string): string {
  return name.replace(/^.*?:\s*/, "");
}

export function FeaturedCarousel({ categories, onSelect }: FeaturedCarouselProps) {
  const [hovered, setHovered] = useState<Category | null>(null);

  if (categories.length === 0) return null;

  const active = hovered ?? categories[0];
  // Slow enough to actually read a title, scales with how many cards
  // there are so a longer list doesn't zip by any faster.
  const durationSeconds = categories.length * 3;

  return (
    <div className="space-y-3 motion-safe:animate-card-in">
      <h3 className="text-sm font-semibold text-slate-400">✨ Featured</h3>
      <div className="grid md:grid-cols-[240px_1fr] gap-4 items-stretch">
        <div
          key={active.id}
          className="hidden md:flex flex-col justify-center rounded-2xl border border-slate-800
            bg-slate-900/60 shadow-card p-4 space-y-3 motion-safe:animate-card-in"
        >
          <div className="text-3xl" aria-hidden>
            {categoryIcon(active.name)}
          </div>
          <h4 className="font-bold text-slate-100">{active.name}</h4>
          <p className="text-xs text-slate-400">
            Test your knowledge of {shortName(active.name)} with real trivia questions, easy to hard.
          </p>
          <div className="space-y-1.5 text-xs text-slate-300">
            <p>🎯 {active.question_count} questions available</p>
            <p>⚡ Earn up to {MAX_XP_PER_QUESTION} XP per question</p>
          </div>
        </div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          <div
            className="flex gap-3 w-max motion-safe:animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {[...categories, ...categories].map((category, i) => (
              <button
                key={`${category.id}-${i}`}
                onMouseEnter={() => setHovered(category)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(category)}
                onBlur={() => setHovered(null)}
                onClick={(e) => onSelect(category, e)}
                className="relative shrink-0 w-40 overflow-hidden rounded-xl border border-slate-800
                  bg-slate-900/60 p-4 text-left shadow-card transition-all duration-200
                  hover:scale-110 hover:z-10 hover:border-amber-500/60 hover:shadow-glow"
              >
                <div className="text-2xl mb-1" aria-hidden>
                  {categoryIcon(category.name)}
                </div>
                <div className="font-semibold text-slate-100 text-sm line-clamp-2">{category.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
