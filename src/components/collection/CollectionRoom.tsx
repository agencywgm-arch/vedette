"use client";

import { useEffect, useRef, useState } from "react";
import {
  WALL_IMAGE,
  WALL_SIZE,
  collection,
  selectableItems,
} from "@/data/collection";
import { mediaRect, type Rect } from "@/lib/media-rect";
import { VERTICAL_VIDEO_CONTENT, VERTICAL_VIDEO_SIZE } from "@/lib/video-timeline";
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
/** Where the wall sits vertically, as a fraction of the room's height: high
 * enough to clear the carousel, low enough to clear the header. */
const PHONE_WALL_CENTRE = 0.46;
const DESKTOP_WALL_CENTRE = 0.46;
/** A 4:3 wall on a 16:9 screen always leaves gutters. The left one is the key
 * hints and the category list, so the wall is centred in what's left of the
 * room rather than in the room itself — otherwise it sits against the nav on
 * one side and a slab of black on the other. */
const DESKTOP_NAV_GUTTER = 260;
/** Vertical share of the room the wall may occupy, leaving the header and the
 * carousel their own air. */
const DESKTOP_WALL_HEIGHT = 0.78;
/** How long the still takes to settle from matching the video's last frame
 * into its resting, fully-visible position. */
const SETTLE_MS = 900;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Where the wall settles once the room has arrived: the whole collection has
 * to be on screen at once — every piece reachable without dragging the
 * picture around first. So this is always contained, never cropped: on a
 * phone the full width of the screen, on a desktop the largest 4:3 that fits
 * between the chrome.
 */
function restRect(size: { width: number; height: number }, compact: boolean): Rect {
  if (compact) {
    const width = size.width;
    const height = (width * WALL_SIZE.h) / WALL_SIZE.w;
    return { left: 0, top: size.height * PHONE_WALL_CENTRE - height / 2, width, height };
  }
  const free = Math.max(320, size.width - DESKTOP_NAV_GUTTER);
  const fitted = mediaRect(free * 0.96, size.height * DESKTOP_WALL_HEIGHT, WALL_SIZE.w, WALL_SIZE.h, "contain");
  return {
    left: size.width - free + (free - fitted.width) / 2,
    top: size.height * DESKTOP_WALL_CENTRE - fitted.height / 2,
    width: fitted.width,
    height: fitted.height,
  };
}

/**
 * Where the wall has to start: exactly the rect the collection video was
 * just showing, so the still photo taking over reads as the same picture
 * rather than a pop to a different size. On a desktop the video is
 * object-cover, full-bleed; on a phone it's a letterboxed file, and the
 * hotspot picture sits inside that letterboxing at a known fraction (see
 * VERTICAL_VIDEO_CONTENT) — not the padded frame itself.
 */
function handoffRect(size: { width: number; height: number }, compact: boolean): Rect {
  if (compact) {
    const scale = Math.min(size.width / VERTICAL_VIDEO_SIZE.w, size.height / VERTICAL_VIDEO_SIZE.h);
    const boxWidth = VERTICAL_VIDEO_SIZE.w * scale;
    const boxHeight = VERTICAL_VIDEO_SIZE.h * scale;
    return {
      left: (size.width - boxWidth) / 2,
      top: (size.height - boxHeight) / 2 + boxHeight * VERTICAL_VIDEO_CONTENT.topFraction,
      width: boxWidth,
      height: boxHeight * VERTICAL_VIDEO_CONTENT.heightFraction,
    };
  }
  return mediaRect(size.width, size.height, WALL_SIZE.w, WALL_SIZE.h, "cover");
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
  const zoomRef = useRef(1);
  const hotspotEls = useRef(new Map<string, HTMLButtonElement | null>());
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // Mounted already matching the video's last frame; flipped one tick later
  // so the browser has something to transition *from* — see the effect below.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // A model's file and the three.js chunk to render it both take real time to
  // fetch — time a click can't hide once the flight is already underway. The
  // room arriving is spare time the visitor spends looking at the wall before
  // touching anything, so warm the cache then instead of at the click.
  useEffect(() => {
    const models = collection.map((i) => i.model).filter((m): m is string => Boolean(m));
    if (models.length === 0) return;
    import("./ModelStage").then(({ preloadModel }) => {
      for (const url of models) preloadModel(url);
    });
  }, []);

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

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setSize({ width: r.width, height: r.height });
      // re-measure the piece in flight against the new box
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

  // Starts exactly where the video left off, then eases into its resting
  // frame one tick later — see the `settled` effect above. Both rects are
  // pure functions of `size`, so a mid-transition resize just re-targets the
  // tween instead of snapping.
  const wall: Rect | null = size ? (settled ? restRect(size, compact) : handoffRect(size, compact)) : null;
  const displayed = displayedId ? collection.find((i) => i.id === displayedId) ?? null : null;
  const inspecting = displayed !== null && !closing;

  return (
    <div ref={rootRef} className="shop-room">
      {wall && (
        <div
          className={`shop-wall-layer ${compact ? "is-compact" : ""}`}
          style={{
            left: wall.left,
            top: wall.top,
            width: wall.width,
            height: wall.height,
            transition: settled
              ? `left ${SETTLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1), top ${SETTLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1), width ${SETTLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1), height ${SETTLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
              : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WALL_IMAGE}
            alt="La collection Vedette accrochée au mur de la boutique"
            className={`shop-wall ${inspecting ? "is-dimmed" : ""}`}
            draggable={false}
          />

          {/* A 4:3 wall on a phone leaves a lot of screen under it. Rather than
              a slab of black, the boutique's own floor carries on downward. */}
          {compact && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={WALL_IMAGE}
              alt=""
              aria-hidden="true"
              className="shop-wall-reflection"
              draggable={false}
            />
          )}

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
                onClick={() => open(item.id)}
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
      {displayed && <ProductPanel item={displayed} onClose={() => select(null)} />}
      {/* after the panel, so the CSS that moves it out of the sheet's way can
          reach it — a sibling combinator only looks forward */}
      {compact && <NavHud compact />}
      <ProductRail onStep={step} onPick={open} />
      {!compact && <ShopFooter />}
    </div>
  );
}
