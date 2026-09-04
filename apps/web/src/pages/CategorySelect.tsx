import { useEffect, useState } from "react";
import { api } from "../api";
import type { Category } from "../types";

export function CategorySelect() {
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
    <ul>
      {categories.map((category) => (
        <li key={category.id}>
          {category.name} ({category.question_count})
        </li>
      ))}
    </ul>
  );
}
