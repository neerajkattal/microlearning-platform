import { useEffect, useState } from "react";
import { api } from "../api";
import type { Category } from "../types";

export function CategorySelect() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.listCategories().then(setCategories);
  }, []);

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
