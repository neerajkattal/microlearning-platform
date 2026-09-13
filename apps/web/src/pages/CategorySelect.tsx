import { useEffect, useState } from "react";
import { api } from "../api";
import type { Category } from "../types";

interface CategorySelectProps {
  onSelectCategory: (categorySlug: string | null, categoryName: string) => void;
}

const ACCENTS = ["bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"];

export function CategorySelect({ onSelectCategory }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(() => setError(true));
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-center text-slate-200">Pick a category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onSelectCategory(null, "Any category")}
          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60
            p-4 text-left shadow-card hover:border-amber-500/50 hover:-translate-y-0.5 transition-all"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="font-semibold text-slate-100">
            <span aria-hidden>🎲</span> Any category
          </div>
          <div className="text-xs text-slate-500 mt-1">Surprise me</div>
        </button>
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.slug, category.name)}
            disabled={category.question_count === 0}
            className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60
              p-4 text-left shadow-card hover:border-amber-500/50 hover:-translate-y-0.5 transition-all
              disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:border-slate-800"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${ACCENTS[index % ACCENTS.length]}`} />
            <div className="font-semibold text-slate-100">{category.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5">
                {category.question_count} questions
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
