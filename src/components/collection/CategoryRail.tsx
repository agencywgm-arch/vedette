"use client";

import { categories } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

export default function CategoryRail() {
  const category = useShopStore((s) => s.category);
  const setCategory = useShopStore((s) => s.setCategory);
  const select = useShopStore((s) => s.select);

  return (
    <nav className="shop-categories">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          className={`shop-category ${category === c ? "is-active" : ""}`}
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
