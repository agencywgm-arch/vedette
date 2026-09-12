"use client";

import { useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import type { Product } from "@/data/products";

export default function VideoHotspot({
  product,
  progress,
  isMobile,
}: {
  product: Product;
  progress: number;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const setActiveProductId = useSceneStore((s) => s.setActiveProductId);

  const x = isMobile ? product.mobileX ?? product.x : product.x;
  const y = isMobile ? product.mobileY ?? product.y : product.y;
  const visible = progress >= product.revealAt;

  return (
    <button
      type="button"
      onClick={() => setActiveProductId(product.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
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
