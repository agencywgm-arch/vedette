"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { useProductSelection } from "@/hooks/useProductSelection";

export default function NavigationHUD() {
  const isMobile = useIsMobile();
  const { isInspecting } = useProductSelection();

  if (isMobile) {
    return (
      <div className="boutique-hud boutique-hud-mobile">
        {isInspecting ? "GLISSER POUR TOURNER · PINCER POUR ZOOMER" : "SWIPE POUR PARCOURIR · TAPER POUR SÉLECTIONNER"}
      </div>
    );
  }

  return (
    <div className="boutique-hud">
      <p className="boutique-hud-title">Navigation</p>
      <div className="boutique-hud-row">
        <span className="boutique-hud-key">A</span>
        <span className="boutique-hud-key">D</span>
        <span>Parcourir</span>
      </div>
      <div className="boutique-hud-row">
        <span className="boutique-hud-key boutique-hud-key-wide">souris</span>
        <span>Sélectionner / tourner</span>
      </div>
      <div className="boutique-hud-row">
        <span className="boutique-hud-key boutique-hud-key-wide">molette</span>
        <span>Zoomer</span>
      </div>
      <div className="boutique-hud-row">
        <span className="boutique-hud-key">ECHAP</span>
        <span>Retour</span>
      </div>
    </div>
  );
}
