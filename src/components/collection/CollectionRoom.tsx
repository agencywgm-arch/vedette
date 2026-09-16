"use client";

import { useEffect, useRef, useState } from "react";
import {
  WALL_IMAGE,
  WALL_SIZE,
  collection,
  selectableItems,
  type CollectionItem,
} from "@/data/collection";
import { mediaRect, spotRect, type Rect } from "@/lib/media-rect";
import { useShopStore } from "@/store/useShopStore";
import FloatingProduct from "./FloatingProduct";
import ProductPanel from "./ProductPanel";
import ProductRail from "./ProductRail";
import CategoryRail from "./CategoryRail";
import NavHud from "./NavHud";
import ShopHeader from "./ShopHeader";
import ShopFooter from "./ShopFooter";

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.8;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * The end of the walk-in: the camera has settled on the wall, and every piece
 * hanging there is now live. Clicking one lifts it off the wall and floats it
 * in the middle of the room — the wall itself stays behind it, dimmed.
 */
export default function CollectionRoom({ compact }: { compact: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const selectedId = useShopStore((s) => s.selectedId);
  const select = useShopStore((s) => s.select);
  const hoveredId = useShopStore((s) => s.hoveredId);
  const setHovered = useShopStore((s) => s.setHovered);

  // Keep the piece on screen while it flies home, then drop it.
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  if (selectedId !== null && selectedId !== displayedId) {
    setDisplayedId(selectedId);
    setClosing(false);
  } else if (selectedId === null && displayedId !== null && !closing) {
    setClosing(true);
  }

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const step = (direction: -1 | 1) => {
    if (selectableItems.length === 0) return;
    const current = selectableItems.findIndex((i) => i.id === selectedId);
    const next =
      current === -1
        ? direction === 1
          ? 0
          : selectableItems.length - 1
        : (current + direction + selectableItems.length) % selectableItems.length;
    select(selectableItems[next].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") select(null);
      else if (k === "a" || e.key === "ArrowLeft") step(-1);
      else if (k === "d" || e.key === "ArrowRight") step(1);
      else if (k === "w" || e.key === "ArrowUp") zoomRef.current = clamp(zoomRef.current + 0.12, MIN_ZOOM, MAX_ZOOM);
      else if (k === "s" || e.key === "ArrowDown") zoomRef.current = clamp(zoomRef.current - 0.12, MIN_ZOOM, MAX_ZOOM);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `step` closes over the current selection, which is exactly what we want
    // re-bound whenever it changes.
  }, [selectedId, select]); // eslint-disable-line react-hooks/exhaustive-deps

  const wall = size
    ? mediaRect(size.width, size.height, WALL_SIZE.w, WALL_SIZE.h, compact ? "contain" : "cover")
    : null;

  const originOf = (item: CollectionItem): Rect | null =>
    wall ? spotRect(item.spot, wall) : null;

  const displayed = displayedId ? collection.find((i) => i.id === displayedId) ?? null : null;
  const displayedOrigin = displayed ? originOf(displayed) : null;
  const inspecting = displayed !== null && !closing;

  return (
    <div ref={rootRef} className="shop-room">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WALL_IMAGE}
        alt="La collection Vedette accrochée au mur de la boutique"
        className={`shop-wall ${compact ? "is-contain" : ""} ${inspecting ? "is-dimmed" : ""}`}
        draggable={false}
      />

      {wall &&
        collection.map((item) => {
          if (item.front === null) return null;
          const r = spotRect(item.spot, wall);
          return (
            <button
              key={item.id}
              type="button"
              className={`shop-hotspot ${hoveredId === item.id ? "is-hovered" : ""}`}
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
              onPointerEnter={() => setHovered(item.id)}
              onPointerLeave={() => setHovered(null)}
              onClick={() => select(item.id)}
              aria-label={item.name}
              hidden={displayed !== null}
            />
          );
        })}

      {inspecting && <div className="shop-backdrop" onClick={() => select(null)} />}

      {displayed && displayedOrigin && size && (
        <FloatingProduct
          key={displayed.id}
          item={displayed}
          origin={displayedOrigin}
          container={size}
          closing={closing}
          compact={compact}
          zoomRef={zoomRef}
          onReturned={() => {
            setDisplayedId(null);
            setClosing(false);
          }}
        />
      )}

      {inspecting && (
        <div className="shop-spin-hint">
          <span>←</span>
          <span className="shop-spin-hint-label">
            360°
            <em>Clique et fais glisser</em>
          </span>
          <span>→</span>
        </div>
      )}

      <ShopHeader />
      {!compact && <NavHud compact={false} />}
      {!compact && <CategoryRail />}
      {compact && <NavHud compact />}
      {displayed && <ProductPanel item={displayed} onClose={() => select(null)} />}
      <ProductRail onStep={step} />
      {!compact && <ShopFooter />}
    </div>
  );
}
