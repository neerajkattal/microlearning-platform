import { useState } from "react";
import { accentHexFor } from "../accentColors";
import { categoryIcon } from "../categoryIcons";
import { Button } from "./ui/Button";
import type { Category } from "../types";

// 10 base XP * the 2.0 "hard" multiplier + the 5 XP speed bonus + the
// max 10 XP streak bonus (services/api/app/quiz_engine/scoring.py) - a
// real number pulled from the actual formula, not a made-up one.
const MAX_XP_PER_QUESTION = 35;

const HOW_TO_PLAY = [
  "Answer within 5 seconds for a speed bonus",
  "Use a hint to eliminate 2 wrong answers",
  "Keep your daily streak alive for bonus XP",
];

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
  const activeColor = accentHexFor(active.id);
  // Slow enough to actually read a title, scales with how many cards
  // there are so a longer list doesn't zip by any faster.
  const durationSeconds = categories.length * 3;

  return (
    <div className="space-y-3 motion-safe:animate-card-in">
      <h3 className="text-sm font-semibold text-slate-400">✨ Featured</h3>
      <div className="grid md:grid-cols-[260px_1fr] gap-4 items-stretch">
        <div
          key={active.id}
          className="hidden md:flex flex-col rounded-2xl border-2 bg-slate-900/80 shadow-card p-4
            space-y-3 motion-safe:animate-card-in transition-colors duration-300"
          style={{ borderColor: activeColor, boxShadow: `0 0 28px -8px ${activeColor}` }}
        >
          <div className="flex items-start justify-between">
            <div className="text-3xl" aria-hidden>
              {categoryIcon(active.name)}
            </div>
            <div
              className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
              style={{ color: activeColor, borderColor: activeColor, borderWidth: 1 }}
            >
              Featured
            </div>
          </div>
          <h4 className="font-bold text-slate-100 leading-tight">{active.name}</h4>
          <p className="text-xs text-slate-400">
            Test your knowledge of {shortName(active.name)} with real trivia questions, easy to hard.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Questions</p>
              <p className="font-bold text-slate-100">🎯 {active.question_count}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Max XP</p>
              <p className="font-bold text-amber-300">⚡ {MAX_XP_PER_QUESTION}</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">How to play</p>
            <ol className="space-y-1 text-xs text-slate-300">
              {HOW_TO_PLAY.map((tip, i) => (
                <li key={tip} className="flex gap-1.5">
                  <span className="text-slate-600">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ol>
          </div>

          <Button onClick={(e) => onSelect(active, e)} className="w-full mt-auto">
            Play Now
          </Button>
        </div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          <div
            className="flex gap-3 w-max motion-safe:animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {[...categories, ...categories].map((category, i) => {
              const color = accentHexFor(category.id);
              const isActive = active.id === category.id;
              return (
                <button
                  key={`${category.id}-${i}`}
                  onMouseEnter={() => setHovered(category)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(category)}
                  onBlur={() => setHovered(null)}
                  onClick={(e) => onSelect(category, e)}
                  className="relative shrink-0 w-40 overflow-hidden rounded-xl border-2 bg-slate-900/60
                    p-4 text-left shadow-card transition-all duration-200 hover:scale-110 hover:z-10"
                  style={{
                    borderColor: isActive ? color : "rgb(30 41 59)",
                    boxShadow: isActive ? `0 0 20px -6px ${color}` : undefined,
                  }}
                >
                  <div className="text-2xl mb-1" aria-hidden>
                    {categoryIcon(category.name)}
                  </div>
                  <div className="font-semibold text-slate-100 text-sm line-clamp-2">{category.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
