import { useEffect, useState } from "react";
import { accentHexFor } from "../accentColors";
import { categoryIcon } from "../categoryIcons";
import { CategoryTile } from "./CategoryTile";
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

// Devices with no real hover (phones/tablets) get a tap-to-preview,
// full-screen info sheet before committing, since a tap is otherwise
// indistinguishable from "start playing this right now".
function useIsTouchDevice(): boolean {
  const query = "(hover: none), (pointer: coarse)";
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true
  );

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const update = () => setIsTouch(mq.matches);
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return isTouch;
}

interface CategoryInfoProps {
  category: Category;
  color: string;
  onPlay: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function CategoryInfo({ category, color, onPlay }: CategoryInfoProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="text-3xl" aria-hidden>
          {categoryIcon(category.name)}
        </div>
        <div
          className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
          style={{ color, borderColor: color, borderWidth: 1 }}
        >
          Featured
        </div>
      </div>
      <h4 className="font-bold text-slate-100 leading-tight">{category.name}</h4>
      <p className="text-xs text-slate-400">
        Test your knowledge of {shortName(category.name)} with real trivia questions, easy to hard.
      </p>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Questions</p>
          <p className="font-bold text-slate-100">🎯 {category.question_count}</p>
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

      <Button onClick={onPlay} className="w-full mt-auto">
        Play Now
      </Button>
    </>
  );
}

export function FeaturedCarousel({ categories, onSelect }: FeaturedCarouselProps) {
  const [previewing, setPreviewing] = useState<Category | null>(null);
  const isTouch = useIsTouchDevice();

  if (categories.length === 0) return null;

  // Scales with how many cards there are so a longer list doesn't zip
  // by any faster - slow enough to actually read a title.
  const durationSeconds = categories.length * 3;

  function handleTileClick(category: Category, e: React.MouseEvent<HTMLButtonElement>) {
    if (isTouch) {
      setPreviewing(category);
    } else {
      onSelect(category, e);
    }
  }

  return (
    <div className="space-y-3 motion-safe:animate-card-in">
      <h3 className="text-sm font-semibold text-slate-400">✨ Featured</h3>

      {/* -my-3 cancels out py-3 in the flow (so this doesn't push later
          content down) while still giving overflow-hidden's clip
          boundary some vertical room to spare - without it, a hovered
          tile's lift-and-scale grows past the row's own height and
          gets its top edge clipped off. */}
      <div className="-my-3 py-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
        <div
          className="flex gap-3 w-max motion-safe:animate-marquee hover:[animation-play-state:paused]"
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          {[...categories, ...categories].map((category, i) => (
            <CategoryTile
              key={`${category.id}-${i}`}
              category={category}
              onClick={(e) => handleTileClick(category, e)}
            />
          ))}
        </div>
      </div>

      {previewing && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-sm overflow-y-auto motion-safe:animate-card-in">
          <div className="max-w-md mx-auto min-h-full p-5 pt-16 relative flex flex-col">
            <button
              onClick={() => setPreviewing(null)}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700
                flex items-center justify-center text-slate-300 text-lg leading-none hover:text-white
                hover:bg-slate-700 transition-colors"
            >
              ✕
            </button>
            <div
              className="flex flex-col rounded-2xl border-2 bg-slate-900/80 shadow-card p-5 space-y-3"
              style={{
                borderColor: accentHexFor(previewing.id),
                boxShadow: `0 0 32px -6px ${accentHexFor(previewing.id)}`,
              }}
            >
              <CategoryInfo
                category={previewing}
                color={accentHexFor(previewing.id)}
                onPlay={(e) => {
                  onSelect(previewing, e);
                  setPreviewing(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
