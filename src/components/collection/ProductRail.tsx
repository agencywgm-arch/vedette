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
            title={item.locked ? `${item.name} — bientôt disponible` : item.name}
            aria-label={item.locked ? `${item.name} — bientôt disponible` : item.name}
            disabled={item.locked}
            className={`shop-tile ${selectedId === item.id ? "is-active" : ""} ${
              item.locked ? "is-locked" : ""
            }`}
            onClick={() => onPick(item.id)}
          >
            <Image
              src={thumbFor(item.id)}
              alt={item.name}
              fill
              sizes="110px"
              className="shop-tile-img"
            />
            {item.locked && (
              <svg className="shop-tile-lock" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="1.5" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            )}
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
