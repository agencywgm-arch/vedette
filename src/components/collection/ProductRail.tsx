"use client";

import Image from "next/image";
import { collection, thumbFor } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

export default function ProductRail({
  onStep,
}: {
  onStep: (direction: -1 | 1) => void;
}) {
  const selectedId = useShopStore((s) => s.selectedId);
  const category = useShopStore((s) => s.category);
  const select = useShopStore((s) => s.select);

  const shown =
    category === "TOUS" ? collection : collection.filter((i) => i.category === category);

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
        {shown.map((item) => {
          const pending = item.front === null;
          return (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              title={pending ? `${item.name} — packshot à venir` : item.name}
              aria-label={item.name}
              className={`shop-tile ${selectedId === item.id ? "is-active" : ""} ${
                pending ? "is-pending" : ""
              }`}
              onClick={() => select(item.id)}
            >
              <Image
                src={thumbFor(item.id)}
                alt={item.name}
                fill
                sizes="110px"
                className="shop-tile-img"
              />
            </button>
          );
        })}
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
