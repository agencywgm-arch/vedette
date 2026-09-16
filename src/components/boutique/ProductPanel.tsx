"use client";

import { useState } from "react";
import { useProductSelection } from "@/hooks/useProductSelection";
import { useCart } from "@/hooks/useCart";

export default function ProductPanel() {
  const { selectedProduct, close } = useProductSelection();
  const { addToCart } = useCart();
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  if (!selectedProduct) return null;
  const activeColor = color ?? selectedProduct.colors[0];
  const activeSize = size ?? selectedProduct.sizes[0];

  return (
    // Keying on the product id remounts this panel (and its color/size
    // selection) fresh whenever a different item is inspected.
    <div className="boutique-panel" key={selectedProduct.id}>
      <button type="button" className="boutique-panel-close" onClick={close} aria-label="Fermer">
        ✕
      </button>
      <p className="boutique-panel-eyebrow">{selectedProduct.category}</p>
      <h3 className="boutique-panel-title">{selectedProduct.name}</h3>
      <p className="boutique-panel-price">{selectedProduct.price}€</p>
      <p className="boutique-panel-desc">{selectedProduct.description}</p>

      <p className="boutique-panel-label">Couleurs</p>
      <div className="boutique-swatches">
        {selectedProduct.colors.map((c) => (
          <button
            key={c}
            type="button"
            className={`boutique-swatch ${activeColor === c ? "is-active" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}
      </div>

      <p className="boutique-panel-label">Tailles</p>
      <div className="boutique-sizes">
        {selectedProduct.sizes.map((s) => (
          <button
            key={s}
            type="button"
            className={`boutique-size ${activeSize === s ? "is-active" : ""}`}
            onClick={() => setSize(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="boutique-add-cart"
        onClick={() => {
          addToCart({ productId: selectedProduct.id, color: activeColor, size: activeSize });
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1600);
        }}
      >
        {justAdded ? "Ajouté ✓" : "Ajouter au panier"}
      </button>
    </div>
  );
}
