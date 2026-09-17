import { accentHexFor } from "../accentColors";
import { categoryIcon } from "../categoryIcons";
import { categoryPhoto } from "../categoryPhotos";
import type { Category } from "../types";

interface CategoryTileProps {
  category: Category;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

// The one rectangular "thumbnail" tile shape shared by the featured
// carousel and every scrolling category row, so they read as the same
// visual language rather than two different card styles bolted
// together.
export function CategoryTile({ category, onClick }: CategoryTileProps) {
  const color = accentHexFor(category.id);

  return (
    <button
      onClick={onClick}
      disabled={category.question_count === 0}
      className="relative shrink-0 w-72 h-40 flex flex-col justify-end overflow-hidden
        rounded-xl border-2 border-ink bg-white text-left shadow-card transition-all duration-200
        hover:-translate-y-1 hover:z-10 hover:shadow-glow
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0
        disabled:hover:shadow-card"
    >
      {/* Grayscale + high-contrast instead of a soft blur/gradient wash -
          a flat, printed-poster treatment that fits this theme's hard
          edges, tinted by the category's own accent via a multiply
          blend rather than a color gradient overlay. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${categoryPhoto(category.name)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.2)",
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: color, opacity: 0.35, mixBlendMode: "multiply" }} />
      <div
        className="absolute top-3 left-3 text-2xl bg-accent-yellow border-2 border-ink rounded-lg w-9 h-9
          flex items-center justify-center"
        aria-hidden
      >
        {categoryIcon(category.name)}
      </div>
      <div className="relative bg-paper border-t-2 border-ink px-3.5 pt-2.5 pb-3 space-y-1.5">
        <div className="font-semibold text-ink text-base leading-tight line-clamp-2">{category.name}</div>
        <span className="inline-block text-[11px] font-bold text-ink bg-white border border-ink rounded-full px-2 py-0.5">
          {category.question_count} questions
        </span>
      </div>
    </button>
  );
}
