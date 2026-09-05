import { useEffect, useState } from "react";
import { api } from "../api";
import type { Category } from "../types";

interface CategorySelectProps {
  onSelectCategory: (categorySlug: string | null) => void;
}

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
    return <p className="text-red-600">Couldn't load categories. Check that the backend is running.</p>;
  }

  if (categories === null) {
    return <p className="text-gray-500">Loading categories...</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
      <button
        onClick={() => onSelectCategory(null)}
        className="p-4 border rounded-lg hover:bg-gray-50 text-left"
      >
        <div className="font-medium">Any category</div>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.slug)}
          disabled={category.question_count === 0}
          className="p-4 border rounded-lg hover:bg-gray-50 text-left disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <div className="font-medium">{category.name}</div>
          <div className="text-sm text-gray-500">{category.question_count} questions</div>
        </button>
      ))}
    </div>
  );
}
