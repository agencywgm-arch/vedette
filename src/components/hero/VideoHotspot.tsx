"use client";

import { useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import type { Product } from "@/data/products";

export interface ContainRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function VideoHotspot({
  product,
  progress,
  isMobile,
  containRect,
}: {
  product: Product;
  progress: number;
  isMobile: boolean;
  containRect: ContainRect | null;
}) {
  const [hovered, setHovered] = useState(false);
  const setActiveProductId = useSceneStore((s) => s.setActiveProductId);

  const px = isMobile ? product.mobileX ?? product.x : product.x;
  const py = isMobile ? product.mobileY ?? product.y : product.y;
  const visible = progress >= product.revealAt;

  // On mobile the clip renders with object-fit: contain, so its on-screen
  // rect (containRect) rarely matches the container's own box — position
  // against that rect instead of plain container percentages.
  const style =
    isMobile && containRect
      ? {
          left: containRect.left + (px / 100) * containRect.width,
          top: containRect.top + (py / 100) * containRect.height,
        }
      : { left: `${px}%`, top: `${py}%` };

  return (
    <button
      type="button"
      onClick={() => setActiveProductId(product.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute z-20"
      style={{
        ...style,
        transform: "translate(-50%, -50%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.4s ease, transform 0.2s ease",
      }}
      aria-label={product.name}
    >
      <span className={`hotspot-badge ${hovered ? "is-hovered" : ""}`}>+</span>
    </button>
  );
}
