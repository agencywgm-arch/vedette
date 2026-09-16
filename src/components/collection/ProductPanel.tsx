"use client";

import { useState } from "react";
import type { CollectionItem } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

function formatPrice(price: number) {
  return `€${price.toFixed(2).replace(".", ",")}`;
}

export default function ProductPanel({
  item,
  onClose,
}: {
  item: CollectionItem;
  onClose: () => void;
}) {
  const addToCart = useShopStore((s) => s.addToCart);
  const [color, setColor] = useState(item.colors[0]?.name ?? "");
  const [size, setSize] = useState(item.sizes[1] ?? item.sizes[0] ?? "");
  const [added, setAdded] = useState(false);

  return (
    <aside className="shop-panel">
      <button type="button" className="shop-panel-close" onClick={onClose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* The wrappers do nothing on desktop, where the sheet stacks. On a phone
          they let the title sit beside the price and the two pickers share one
          row, which is most of what makes the sheet short enough there. */}
      <div className="shop-panel-head">
        <h2 className="shop-panel-title">{item.name}</h2>
        <p className="shop-panel-price">{formatPrice(item.price)}</p>
      </div>
      <hr className="shop-panel-rule" />
      <p className="shop-panel-desc">{item.description}</p>

      <div className="shop-panel-fields">
        <div className="shop-panel-field">
          <p className="shop-panel-label">Couleurs</p>
          <div className="shop-swatches">
            {item.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={color === c.name}
                className={`shop-swatch ${color === c.name ? "is-active" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.name)}
              />
            ))}
          </div>
        </div>

        <div className="shop-panel-field">
          <p className="shop-panel-label">Tailles</p>
          <div className="shop-sizes">
            {item.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                className={`shop-size ${size === s ? "is-active" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="shop-cta"
        onClick={() => {
          addToCart({ itemId: item.id, color, size });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1800);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 8h12l-1 12H7L6 8z" />
          <path d="M9 8V6a3 3 0 016 0v2" />
        </svg>
        {added ? "Ajouté au panier" : "Ajouter au panier"}
      </button>

      <button type="button" className="shop-cta shop-cta-ghost">
        Voir les détails
      </button>
    </aside>
  );
}
