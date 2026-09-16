"use client";

import { categories } from "@/data/products";
import { useBoutiqueStore } from "@/store/useBoutiqueStore";

export default function CategoryMenu() {
  const category = useBoutiqueStore((s) => s.category);
  const setCategory = useBoutiqueStore((s) => s.setCategory);
  const select = useBoutiqueStore((s) => s.select);

  return (
    <nav className="boutique-category-menu">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          className={`boutique-category-item ${category === c ? "is-active" : ""}`}
          onClick={() => {
            setCategory(c);
            select(null);
          }}
        >
          {c}
        </button>
      ))}
    </nav>
  );
}
