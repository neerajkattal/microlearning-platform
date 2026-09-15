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
        rounded-xl border-2 bg-slate-900/60 text-left shadow-card transition-all duration-200
        hover:-translate-y-2 hover:scale-105 hover:z-10 hover:shadow-glow
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0
        disabled:hover:scale-100 disabled:hover:shadow-card"
      style={{
        borderColor: `${color}55`,
        backgroundImage: `linear-gradient(${color}4d, rgba(2,6,23,0.6)), url("${categoryPhoto(category.name)}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute top-3 left-3 text-2xl bg-slate-950/60 rounded-lg w-9 h-9 flex items-center justify-center"
        aria-hidden
      >
        {categoryIcon(category.name)}
      </div>
      <div className="bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-3.5 pt-8 pb-3 space-y-1.5">
        <div className="font-semibold text-slate-100 text-base leading-tight line-clamp-2">{category.name}</div>
        <span className="inline-block text-[11px] font-medium text-slate-300 bg-slate-800/80 rounded-full px-2 py-0.5">
          {category.question_count} questions
        </span>
      </div>
    </button>
  );
}
