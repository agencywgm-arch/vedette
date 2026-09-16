"use client";

import { useEffect } from "react";
import BoutiqueScene from "./BoutiqueScene";
import BoutiqueHeader from "./BoutiqueHeader";
import BoutiqueFooter from "./BoutiqueFooter";
import CategoryMenu from "./CategoryMenu";
import NavigationHUD from "./NavigationHUD";
import ProductPanel from "./ProductPanel";
import ProductCarousel from "./ProductCarousel";
import { useCameraControls } from "@/hooks/useCameraControls";
import { useProductSelection } from "@/hooks/useProductSelection";

/** The real interactive boutique: a live Three.js showroom (not a video),
 * reached once the entrance clip finishes. Owns the camera-pan input at the
 * DOM level (keyboard + drag/swipe) and the ESC-to-close shortcut; the 3D
 * scene and every HTML overlay (header, category rail, product panel,
 * carousel, HUD, footer) are plain siblings on top of it. */
export default function BoutiqueSection() {
  const { targetXRef, panHandlers } = useCameraControls();
  const { isInspecting, close } = useProductSelection();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div className="boutique-root">
      <div
        className="boutique-canvas-wrap"
        style={{ touchAction: "none" }}
        {...panHandlers}
      >
        <BoutiqueScene targetXRef={targetXRef} />
      </div>

      {isInspecting && <div className="boutique-backdrop" onClick={close} />}

      <BoutiqueHeader />
      <CategoryMenu />
      <NavigationHUD />
      <ProductPanel />
      <ProductCarousel />
      <BoutiqueFooter />
    </div>
  );
}
