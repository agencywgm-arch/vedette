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
import { createVideoScrubber } from "@/lib/video-scrubber";
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
/** Dragging this many px fully reveals the cashier clip — short enough for a
 * comfortable thumb swipe, long enough that it doesn't fire on a stray tap. */
const PEEK_DRAG_PX = 220;
/** A drag under this is a tap, not a swipe — read as a click on whichever
 * chevron it landed on rather than starting the drag-scrub. */
const PEEK_DRAG_THRESHOLD = 6;
/** How fast the click-triggered (rather than dragged) peek eases toward its
 * target each frame — a fraction of the remaining distance, not a fixed ms,
 * so it still feels immediate if released partway through a drag. */
const PEEK_EASE = 0.16;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Where the wall settles once the room has arrived: the whole collection has
 * to be on screen at once — every piece reachable without dragging the
 * picture around first. On a phone the video is already object-contain (the
 * whole photo, full width, never cropped) — its own rect already satisfies
 * that, and it's the same size a from-scratch "fit the width" box would come
 * out to, so resting anywhere else would just be an unmotivated drift. On a
 * desktop the video is object-cover (full-bleed, cropped), which does need
 * to relax into a smaller, uncropped frame — the largest 4:3 that fits
 * between the chrome.
 */
function restRect(size: { width: number; height: number }, compact: boolean): Rect {
  if (compact) return handoffRect(size, compact);
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
    const models = collection
      .flatMap((i) => [i.model, i.accessory?.model])
      .filter((m): m is string => Boolean(m));
    if (models.length === 0) return;
    import("./ModelStage").then(({ preloadModel }) => {
      for (const url of models) preloadModel(url);
    });
  }, []);

  const selectedId = useShopStore((s) => s.selectedId);
  const select = useShopStore((s) => s.select);
  const hoveredId = useShopStore((s) => s.hoveredId);
  const setHovered = useShopStore((s) => s.setHovered);

  // Sliding — or clicking the chevron — toward the cashier plays a second
  // clip cross-fading in over the wall, giving the illusion of turning to
  // look further into the room. 0 is the wall, 1 is fully on the cashier.
  // Lives in a ref and gets written to the DOM every frame by the rAF loop
  // below, the same way FloatingProduct drives its own transform — a drag
  // gesture moves at 60fps and re-rendering React for each step would be
  // both slower and pointless, since nothing here needs to be in the tree.
  const lookRight = useRef(0);
  const peekTarget = useRef<number | null>(null);
  const peekDrag = useRef<{ startX: number; startLook: number; moved: boolean } | null>(null);
  const [peeking, setPeeking] = useState(false);
  const wallImgRef = useRef<HTMLImageElement>(null);
  const peekVideoRef = useRef<HTMLVideoElement>(null);
  const hotspotLayerRef = useRef<HTMLDivElement>(null);
  const scrubPeek = useState(() => createVideoScrubber())[0];

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (peekTarget.current !== null) {
        const t = peekTarget.current;
        const next = lookRight.current + (t - lookRight.current) * PEEK_EASE;
        lookRight.current = Math.abs(t - next) < 0.001 ? t : next;
        if (lookRight.current === t) peekTarget.current = null;
      }
      const v = lookRight.current;
      if (wallImgRef.current) wallImgRef.current.style.opacity = `${1 - v}`;
      if (hotspotLayerRef.current) {
        hotspotLayerRef.current.style.opacity = `${1 - v}`;
        hotspotLayerRef.current.style.pointerEvents = v > 0.05 ? "none" : "auto";
      }
      if (peekVideoRef.current) {
        peekVideoRef.current.style.opacity = `${v}`;
        scrubPeek(peekVideoRef.current, v);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scrubPeek]);

  const setPeek = (v: number) => {
    peekTarget.current = null;
    lookRight.current = clamp(v, 0, 1);
    setPeeking(lookRight.current > 0.5);
  };

  const animatePeekTo = (v: number) => {
    peekTarget.current = clamp(v, 0, 1);
    setPeeking(peekTarget.current > 0.5);
  };

  const onPeekPointerDown = (e: ReactPointerEvent) => {
    if (selectedId !== null) return;
    peekDrag.current = { startX: e.clientX, startLook: lookRight.current, moved: false };
    peekTarget.current = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPeekPointerMove = (e: ReactPointerEvent) => {
    const d = peekDrag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > PEEK_DRAG_THRESHOLD) d.moved = true;
    if (d.moved) setPeek(d.startLook + dx / PEEK_DRAG_PX);
  };

  const endPeekDrag = () => {
    const d = peekDrag.current;
    peekDrag.current = null;
    if (!d || !d.moved) return;
    // Release mid-drag settles toward whichever side it's closer to, like a
    // carousel snapping to the nearest card rather than freezing half-turned.
    animatePeekTo(lookRight.current > 0.5 ? 1 : 0);
  };

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
            touchAction: "pan-y",
          }}
          onPointerDown={onPeekPointerDown}
          onPointerMove={onPeekPointerMove}
          onPointerUp={endPeekDrag}
          onPointerCancel={endPeekDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={wallImgRef}
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

          <div ref={hotspotLayerRef} className="shop-hotspot-layer">
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

          {/* Sliding — or clicking the chevron — toward the cashier reveals
              this clip in place of the wall photo: same rect, cross-faded, so
              it reads as turning to look further into the room rather than a
              second picture appearing. Never actually played — scrubbed by
              the rAF loop exactly like the hero videos — and pointer-events:
              none for the same reason theirs are: a tap on a <video> can
              still reach its native play gesture on some browsers regardless
              of this style, so the drag itself is handled one level up, on
              the wall layer. */}
          <video
            ref={peekVideoRef}
            className="shop-peek-video"
            style={{ opacity: 0, pointerEvents: "none" }}
            poster="/videos/cashier-peek-poster.jpg"
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
          >
            <source src="/videos/cashier-peek.mp4" type="video/mp4" />
            <source src="/videos/cashier-peek.webm" type="video/webm" />
          </video>

          <button
            type="button"
            className={`shop-peek-chevron shop-peek-chevron-right ${peeking ? "is-hidden" : ""}`}
            onClick={() => animatePeekTo(1)}
            aria-label="Regarder vers la caisse"
          >
            ›
          </button>
          <button
            type="button"
            className={`shop-peek-chevron shop-peek-chevron-left ${peeking ? "" : "is-hidden"}`}
            onClick={() => animatePeekTo(0)}
            aria-label="Revenir à la collection"
          >
            ‹
          </button>
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
