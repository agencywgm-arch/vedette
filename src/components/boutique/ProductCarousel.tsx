"use client";

import Image from "next/image";
import { products } from "@/data/products";
import { useProductSelection } from "@/hooks/useProductSelection";
import { useBoutiqueStore } from "@/store/useBoutiqueStore";

export default function ProductCarousel() {
  const { selectedProduct, select } = useProductSelection();
  const category = useBoutiqueStore((s) => s.category);
  const visible =
    category === "TOUS" ? products : products.filter((p) => p.category === category);

  return (
    <div className="boutique-carousel">
      {visible.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => select(p.id)}
          className={`boutique-carousel-item ${selectedProduct?.id === p.id ? "is-active" : ""}`}
          aria-label={p.name}
        >
          <Image src={p.image} alt={p.name} fill sizes="90px" className="boutique-carousel-image" />
        </button>
      ))}
    </div>
  );
}
