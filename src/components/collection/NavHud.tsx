"use client";

import { useShopStore } from "@/store/useShopStore";

export default function NavHud({ compact }: { compact: boolean }) {
  const inspecting = useShopStore((s) => s.selectedId !== null);

  if (compact) {
    return (
      <div className="shop-hud shop-hud-compact">
        {inspecting
          ? "Glisse pour tourner · Pince pour zoomer"
          : "Glisse pour parcourir le mur · Tape une pièce"}
      </div>
    );
  }

  return (
    <div className="shop-hud">
      <p className="shop-hud-title">Navigation</p>
      <div className="shop-hud-row">
        <kbd>A</kbd>
        <kbd>D</kbd>
        <span>Parcourir</span>
      </div>
      <div className="shop-hud-row">
        <kbd>W</kbd>
        <kbd>S</kbd>
        <span>Zoom</span>
      </div>
      <div className="shop-hud-row">
        <kbd className="shop-hud-mouse" aria-hidden="true" />
        <span>Sélectionner</span>
      </div>
      <div className="shop-hud-row">
        <kbd className="shop-hud-wide">Echap</kbd>
        <span>Retour</span>
      </div>
    </div>
  );
}
