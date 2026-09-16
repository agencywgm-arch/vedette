"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  WALL_IMAGE,
  WALL_SIZE,
  collection,
  selectableItems,
} from "@/data/collection";
import { mediaRect, type Rect } from "@/lib/media-rect";
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
/** On a phone the wall runs a little wider than the screen: enough that the
 * pieces are comfortable to tap, not so much that you lose the shop around
 * them. The rest of it comes in by dragging sideways. */
const PHONE_OVERSCAN = 1.72;
const PHONE_WALL_CENTRE = 0.43;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * The end of the walk-in: the camera has settled on the wall, and every piece
 * hanging there is now live. Clicking one lifts it off the wall and floats it
 * in the middle of the room — the wall itself stays behind it, dimmed.
 *
 * The wall is an explicitly positioned layer rather than an object-fit image,
 * so the picture and the hotspots share one rect and can never drift apart.
 * On a phone that rect is wider than the screen and dragging pans along it,
 * which keeps the pieces big enough to actually tap.
 */
export default function CollectionRoom({ compact }: { compact: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef(0);
  const dragRef = useRef<{ x: number; pan: number; moved: boolean } | null>(null);
  const hotspotEls = useRef(new Map<string, HTMLButtonElement | null>());
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const selectedId = useShopStore((s) => s.selectedId);
  const select = useShopStore((s) => s.select);
  const hoveredId = useShopStore((s) => s.hoveredId);
  const setHovered = useShopStore((s) => s.setHovered);

  // Keep the piece on screen while it flies home, then drop it. `origin` is
  // read off the real hotspot element, so the flight starts and lands exactly
  // where the piece hangs, whatever the pan or the viewport.
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Rect | null>(null);
  const [closing, setClosing] = useState(false);

  const measure = (id: string): Rect | null => {
    const el = hotspotEls.current.get(id);
    const root = rootRef.current;
    if (!el || !root) return null;
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
  };

  const open = (id: string) => {
    const rect = measure(id);
    if (!rect) return;
    setOrigin(rect);
    setDisplayedId(id);
    setClosing(false);
    select(id);
  };

  // Every way of picking a piece — the wall, the rail, the keyboard — goes
  // through `open` so the origin is always measured off the real hotspot.
  // Closing is the one transition that can be derived here, no DOM needed.
  if (selectedId === null && displayedId !== null && !closing) {
    setClosing(true);
  }

  const panLimits = () => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return 0;
    return Math.max(0, (layer.offsetWidth - root.clientWidth) / 2);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setSize({ width: r.width, height: r.height });
      // re-clamp the pan and re-measure the piece in flight against the new box
      const limit = panLimits();
      panRef.current = clamp(panRef.current, -limit, limit);
      if (layerRef.current) {
        layerRef.current.style.transform = `translateX(${panRef.current}px)`;
      }
      setDisplayedId((current) => {
        if (current) {
          const rect = measure(current);
          if (rect) setOrigin(rect);
        }
        return current;
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (selectedId !== null || panLimits() === 0) return;
    dragRef.current = { x: e.clientX, pan: panRef.current, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    const limit = panLimits();
    panRef.current = clamp(d.pan + dx, -limit, limit);
    if (layerRef.current) {
      layerRef.current.style.transform = `translateX(${panRef.current}px)`;
    }
  };

  const endPan = () => {
    dragRef.current = null;
  };

  const step = (direction: -1 | 1) => {
    if (selectableItems.length === 0) return;
    const current = selectableItems.findIndex((i) => i.id === selectedId);
    const next =
      current === -1
        ? direction === 1
          ? 0
          : selectableItems.length - 1
        : (current + direction + selectableItems.length) % selectableItems.length;
    open(selectableItems[next].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") select(null);
      else if (k === "a" || e.key === "ArrowLeft") step(-1);
      else if (k === "d" || e.key === "ArrowRight") step(1);
      else if (k === "w" || e.key === "ArrowUp")
        zoomRef.current = clamp(zoomRef.current + 0.12, MIN_ZOOM, MAX_ZOOM);
      else if (k === "s" || e.key === "ArrowDown")
        zoomRef.current = clamp(zoomRef.current - 0.12, MIN_ZOOM, MAX_ZOOM);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `step` closes over the current selection, which is what we want rebound.
  }, [selectedId, select]); // eslint-disable-line react-hooks/exhaustive-deps

  let wall: Rect | null = null;
  if (size) {
    if (compact) {
      const width = size.width * PHONE_OVERSCAN;
      const height = (width * WALL_SIZE.h) / WALL_SIZE.w;
      wall = {
        left: (size.width - width) / 2,
        top: size.height * PHONE_WALL_CENTRE - height / 2,
        width,
        height,
      };
    } else {
      wall = mediaRect(size.width, size.height, WALL_SIZE.w, WALL_SIZE.h, "cover");
    }
  }
  const displayed = displayedId ? collection.find((i) => i.id === displayedId) ?? null : null;
  const inspecting = displayed !== null && !closing;

  return (
    <div
      ref={rootRef}
      className="shop-room"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onPointerLeave={endPan}
    >
      {wall && (
        <div
          ref={layerRef}
          className={`shop-wall-layer ${compact ? "is-compact" : ""}`}
          style={{ left: wall.left, top: wall.top, width: wall.width, height: wall.height }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WALL_IMAGE}
            alt="La collection Vedette accrochée au mur de la boutique"
            className={`shop-wall ${inspecting ? "is-dimmed" : ""}`}
            draggable={false}
          />

          {collection.map((item) => {
            if (item.front === null) return null;
            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  hotspotEls.current.set(item.id, el);
                }}
                className={`shop-hotspot ${hoveredId === item.id ? "is-hovered" : ""} ${
                  displayed !== null ? "is-locked" : ""
                }`}
                style={{
                  left: `${item.spot.x - item.spot.w / 2}%`,
                  top: `${item.spot.y - item.spot.h / 2}%`,
                  width: `${item.spot.w}%`,
                  height: `${item.spot.h}%`,
                }}
                onPointerEnter={() => setHovered(item.id)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => {
                  // a pan gesture shouldn't also pick the piece it ended on
                  if (dragRef.current?.moved) return;
                  open(item.id);
                }}
                aria-label={item.name}
              />
            );
          })}
        </div>
      )}

      {inspecting && <div className="shop-backdrop" onClick={() => select(null)} />}

      {displayed && origin && size && (
        <FloatingProduct
          key={displayed.id}
          item={displayed}
          origin={origin}
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

      {inspecting && !compact && (
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
      <ProductRail onStep={step} onPick={open} />
      {!compact && <ShopFooter />}
    </div>
  );
}
