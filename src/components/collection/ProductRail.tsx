"use client";

import Image from "next/image";
import { selectableItems, thumbFor } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

export default function ProductRail({
  onStep,
  onPick,
}: {
  onStep: (direction: -1 | 1) => void;
  onPick: (id: string) => void;
}) {
  const selectedId = useShopStore((s) => s.selectedId);
  const category = useShopStore((s) => s.category);

  const shown =
    category === "TOUS"
      ? selectableItems
      : selectableItems.filter((i) => i.category === category);

  if (shown.length === 0) return null;

  return (
    <div className="shop-rail">
      <button
        type="button"
        className="shop-rail-arrow"
        onClick={() => onStep(-1)}
        aria-label="Produit précédent"
      >
        ‹
      </button>

      <div className="shop-rail-track">
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.name}
            aria-label={item.name}
            className={`shop-tile ${selectedId === item.id ? "is-active" : ""}`}
            onClick={() => onPick(item.id)}
          >
            <Image
              src={thumbFor(item.id)}
              alt={item.name}
              fill
              sizes="110px"
              className="shop-tile-img"
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        className="shop-rail-arrow"
        onClick={() => onStep(1)}
        aria-label="Produit suivant"
      >
        ›
      </button>
    </div>
  );
}
