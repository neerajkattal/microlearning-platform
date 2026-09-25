import { useEffect, useState } from "react";
import { api } from "../api";
import { accentHexFor } from "../accentColors";
import { categoryIcon } from "../categoryIcons";
import { categoryPhoto } from "../categoryPhotos";
import { groupByCategory } from "../categoryGroups";
import { CardExpandOverlay } from "../components/CardExpandOverlay";
import { CategoryRow } from "../components/CategoryRow";
import { FeaturedCarousel } from "../components/FeaturedCarousel";
import { ProgressRing } from "../components/ProgressRing";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useCardExpand } from "../useCardExpand";
import type { Category, UserMe } from "../types";

interface CategorySelectProps {
  onSelectCategory: (categorySlug: string | null, categoryName: string, color: string, icon: string) => void;
}

const ANY_CATEGORY_COLOR = "#fb923c";
const XP_PER_LEVEL = 100;
const FEATURED_COUNT = 8;

export function CategorySelect({ onSelectCategory }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);
  const [search, setSearch] = useState("");
  const [requestedTopics, setRequestedTopics] = useState<Set<string>>(new Set());
  const [requestingTopic, setRequestingTopic] = useState(false);
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
    return <LoadingScreen />;
  }

  const trimmedSearch = search.trim().toLowerCase();
  const isSearching = trimmedSearch.length > 0;
  const searchResults = isSearching
    ? categories.filter((category) => category.name.toLowerCase().includes(trimmedSearch))
    : categories;
  const grouped = groupByCategory(searchResults, (category) => category.name);
  const featured = categories
    .filter((category) => category.question_count > 0)
    .sort((a, b) => b.question_count - a.question_count)
    .slice(0, FEATURED_COUNT);
  const xpIntoLevel = me ? me.stats.xp % XP_PER_LEVEL : 0;

  async function handleRequestTopic() {
    const topic = search.trim();
    if (!topic || requestingTopic) return;
    setRequestingTopic(true);
    try {
      await api.requestTopic(topic);
      setRequestedTopics((prev) => new Set(prev).add(topic.toLowerCase()));
    } catch {
      // Not critical enough to interrupt the player with an error state -
      // worst case they just don't see the "thanks" confirmation and can
      // try again.
    } finally {
      setRequestingTopic(false);
    }
  }

  function selectWithExpand(
    e: React.MouseEvent<HTMLButtonElement>,
    slug: string | null,
    name: string,
    color: string,
    icon: string
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    trigger(
      { top: rect.top, left: rect.left, width: rect.width, height: rect.height, color, icon, photo: categoryPhoto(name) },
      () => onSelectCategory(slug, name, color, icon)
    );
  }

  return (
    <div className="space-y-6">
      <CardExpandOverlay target={target} expanded={expanded} />

      {me && (
        <div
          className="rounded-2xl border border-ink bg-white/60 shadow-card p-4 flex items-center
            gap-4 motion-safe:animate-card-in"
        >
          <ProgressRing percent={xpIntoLevel}>
            <span className="text-sm font-extrabold text-ink">{me.stats.level}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink truncate">
              Welcome back, {me.user.username}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {xpIntoLevel}/{XP_PER_LEVEL} XP to level {me.stats.level + 1}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-amber-700 flex items-center gap-1 whitespace-nowrap">
            <span aria-hidden>🔥</span>
            {me.stats.current_streak}
          </p>
        </div>
      )}

      <div className="relative motion-safe:animate-card-in">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="w-full rounded-full border border-ink bg-white/60 py-3 pl-11 pr-4 text-sm
            text-ink placeholder:text-stone-500 shadow-card outline-none transition-colors
            focus:border-ink"
        />
      </div>

      {!isSearching && (
        <FeaturedCarousel
          categories={featured}
          onSelect={(category, e) =>
            selectWithExpand(e, category.slug, category.name, accentHexFor(category.id), categoryIcon(category.name))
          }
        />
      )}

      <h2 className="text-lg font-bold text-center text-stone-800">
        {isSearching ? `Results for "${search.trim()}"` : "Pick a category"}
      </h2>

      {!isSearching && (
        <button
          onClick={(e) => selectWithExpand(e, null, "Any category", ANY_CATEGORY_COLOR, "🎲")}
          className="group relative w-full overflow-hidden rounded-xl border border-ink bg-white/60
            p-4 text-left shadow-card hover:border-ink hover:shadow-glow hover:-translate-y-0.5
            transition-all motion-safe:animate-card-in flex items-center gap-3"
        >
          <div className="absolute left-0 top-0 h-full w-1.5 bg-accent-coral" />
          <div className="text-2xl" aria-hidden>
            🎲
          </div>
          <div>
            <div className="font-semibold text-ink">Any category</div>
            <div className="text-xs text-stone-500 mt-0.5">Surprise me</div>
          </div>
        </button>
      )}

      {isSearching && grouped.length === 0 && (
        <div className="text-center space-y-3">
          <p className="text-stone-500">No categories match "{search.trim()}".</p>
          {requestedTopics.has(trimmedSearch) ? (
            <p className="inline-block text-sm font-semibold text-ink bg-accent-yellow border-2 border-ink rounded-full px-4 py-2">
              Thanks! We'll consider adding "{search.trim()}".
            </p>
          ) : (
            <button
              onClick={handleRequestTopic}
              disabled={requestingTopic}
              className="text-sm font-semibold px-4 py-2 rounded-full border-2 border-ink bg-accent-yellow
                shadow-card hover:shadow-glow hover:-translate-y-0.5 active:shadow-none active:translate-y-0
                transition-all disabled:opacity-40"
            >
              {requestingTopic ? "Requesting..." : `Request "${search.trim()}" as a topic`}
            </button>
          )}
        </div>
      )}

      {grouped.map(([label, groupCategories]) => (
        <CategoryRow
          key={label}
          label={label}
          categories={groupCategories}
          onSelect={(category, e) =>
            selectWithExpand(e, category.slug, category.name, accentHexFor(category.id), categoryIcon(category.name))
          }
        />
      ))}
    </div>
  );
}
