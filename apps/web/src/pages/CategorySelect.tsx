import { useEffect, useState } from "react";
import { api } from "../api";
import { categoryIcon } from "../categoryIcons";
import { groupByCategory } from "../categoryGroups";
import { CardExpandOverlay } from "../components/CardExpandOverlay";
import { FeaturedCarousel } from "../components/FeaturedCarousel";
import { ProgressRing } from "../components/ProgressRing";
import { useCardExpand } from "../useCardExpand";
import type { Category, UserMe } from "../types";

interface CategorySelectProps {
  onSelectCategory: (categorySlug: string | null, categoryName: string) => void;
}

const ACCENTS = ["bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"];
// Same colors as ACCENTS above, as real CSS values - the expand overlay
// is a `position: fixed` element with inline styles, so it needs an
// actual color, not a Tailwind class name.
const ACCENT_HEX = ["#f59e0b", "#3b82f6", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4"];
const ANY_CATEGORY_COLOR = "#f59e0b";
const XP_PER_LEVEL = 100;
const FEATURED_COUNT = 8;

export function CategorySelect({ onSelectCategory }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);
  const { target, expanded, trigger } = useCardExpand();

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(() => setError(true));
    // The stats banner is a nice-to-have on this screen, not the page's
    // reason to exist - if it fails to load, the category grid below
    // still works fine, so this failure is silently swallowed rather
    // than blocking the whole screen behind its own error state.
    api.getMe().then(setMe).catch(() => {});
  }, []);

  if (error) {
    return (
      <p className="text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg py-3 px-4">
        Couldn't load categories. Check that the backend is running.
      </p>
    );
  }

  if (categories === null) {
    return <p className="text-slate-500 text-center">Loading categories...</p>;
  }

  const grouped = groupByCategory(categories, (category) => category.name);
  const featured = categories
    .filter((category) => category.question_count > 0)
    .sort((a, b) => b.question_count - a.question_count)
    .slice(0, FEATURED_COUNT);
  const xpIntoLevel = me ? me.stats.xp % XP_PER_LEVEL : 0;
  let cardIndex = 0;

  function selectWithExpand(
    e: React.MouseEvent<HTMLButtonElement>,
    slug: string | null,
    name: string,
    color: string,
    icon: string
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    trigger({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, color, icon }, () =>
      onSelectCategory(slug, name)
    );
  }

  return (
    <div className="space-y-6">
      <CardExpandOverlay target={target} expanded={expanded} />

      {me && (
        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-4 flex items-center
            gap-4 motion-safe:animate-card-in"
        >
          <ProgressRing percent={xpIntoLevel}>
            <span className="text-sm font-extrabold text-slate-100">{me.stats.level}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100 truncate">
              Welcome back, {me.user.username}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {xpIntoLevel}/{XP_PER_LEVEL} XP to level {me.stats.level + 1}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-amber-300 flex items-center gap-1 whitespace-nowrap">
            <span aria-hidden>🔥</span>
            {me.stats.current_streak}
          </p>
        </div>
      )}

      <FeaturedCarousel
        categories={featured}
        onSelect={(category, e) =>
          selectWithExpand(
            e,
            category.slug,
            category.name,
            ACCENT_HEX[category.id % ACCENT_HEX.length],
            categoryIcon(category.name)
          )
        }
      />

      <h2 className="text-lg font-bold text-center text-slate-200">Pick a category</h2>

      <button
        onClick={(e) => selectWithExpand(e, null, "Any category", ANY_CATEGORY_COLOR, "🎲")}
        className="group relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60
          p-4 text-left shadow-card hover:border-amber-500/50 hover:shadow-glow hover:-translate-y-0.5
          transition-all motion-safe:animate-card-in flex items-center gap-3"
      >
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
        <div className="text-2xl" aria-hidden>
          🎲
        </div>
        <div>
          <div className="font-semibold text-slate-100">Any category</div>
          <div className="text-xs text-slate-500 mt-0.5">Surprise me</div>
        </div>
      </button>

      {grouped.map(([label, groupCategories]) => (
        <div key={label} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-400">{label}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groupCategories.map((category) => {
              const index = cardIndex++;
              return (
                <button
                  key={category.id}
                  onClick={(e) =>
                    selectWithExpand(
                      e,
                      category.slug,
                      category.name,
                      ACCENT_HEX[index % ACCENT_HEX.length],
                      categoryIcon(category.name)
                    )
                  }
                  disabled={category.question_count === 0}
                  style={{ animationDelay: `${Math.min(index * 15, 300)}ms` }}
                  className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60
                    p-4 text-left shadow-card hover:border-amber-500/50 hover:shadow-glow hover:-translate-y-0.5
                    hover:scale-[1.02] transition-all motion-safe:animate-card-in
                    disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:scale-100
                    disabled:hover:border-slate-800 disabled:hover:shadow-card"
                >
                  <div className={`absolute left-0 top-0 h-full w-1 ${ACCENTS[index % ACCENTS.length]}`} />
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
