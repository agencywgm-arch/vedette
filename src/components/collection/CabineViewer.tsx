"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useZoom } from "@/lib/use-zoom";

export const CABINE_FRAMES = 8;
/** Bump when the fitting-room photos change: busts copies cached by phones. */
const CABINE_VERSION = "20261014o";
/** Degrees turned per pixel dragged: one viewport width is half a turn. */
const DEG_PER_PX = 0.45;
const FRICTION = 0.92;

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * The mannequin wearing the piece, shot at even angles around (8 shots →
 * every 45°). Dragging (or the arrows / keyboard) spins it; on release it
 * glides to the nearest shot so a resting view is always a real photograph.
 * Between shots the two nearest photos cross-fade, which reads as rotation
 * while the finger is moving. With only a few shots (the fit views, 4 → every
 * 90°) a cross-fade would just ghost, so the view snaps instead.
 */
export default function CabineViewer({
  base,
  label,
  frames = CABINE_FRAMES,
}: {
  base: string;
  label: string;
  frames?: number;
}) {
  const STEP = 360 / frames;
  const zoom = useZoom({ min: 1, max: 4 });
  // Photo-shoot look: each angle is a hard cut to the next shot, announced by a
  // camera flash, rather than a blend between two photos.
  const crossfade = false;
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);
  const shown = useRef<number | null>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const raf = useRef(0);
  const [frame, setFrame] = useState(0);
  const [touched, setTouched] = useState(false);
  // The set on screen. A new `base` (another morphology, or Homme/Femme) is
  // fetched and decoded off-screen first, then swapped in whole — so changing
  // set never shows a black or half-loaded stage.
  const [active, setActive] = useState(base);
  const [switching, setSwitching] = useState(false);
  const ready = useRef<boolean[]>([]);
  const [loaded, setLoaded] = useState(0);

  const paint = useCallback(() => {
    const a = wrap(angle.current) / STEP;
    const lo = Math.floor(a) % frames;
    const hi = (lo + 1) % frames;
    const t = a - Math.floor(a);
    const want = Math.round(a) % frames;
    // Never cut to a shot that has not arrived yet: hold the closest one that has.
    let near = want;
    if (!ready.current[want]) {
      for (let d = 1; d < frames; d++) {
        const l = (want - d + frames) % frames;
        const r = (want + d) % frames;
        if (ready.current[l]) { near = l; break; }
        if (ready.current[r]) { near = r; break; }
      }
    }
    for (let i = 0; i < frames; i++) {
      const el = imgs.current[i];
      if (!el) continue;
      if (crossfade) {
        el.style.opacity =
          i === lo ? String(1 - t) : i === hi ? String(t) : "0";
      } else {
        el.style.opacity = i === near ? "1" : "0";
      }
    }
    if (shown.current !== near) {
      if (shown.current !== null) {
        const f = flashRef.current;
        if (f) {
          f.classList.remove("is-flashing");
          void f.offsetWidth; // restart the animation on every shot
          f.classList.add("is-flashing");
        }
      }
      shown.current = near;
    }
    setFrame((prev) => (prev === near ? prev : near));
  }, [frames, STEP, crossfade]);

  // Fetch + decode every shot of the incoming set, then swap.
  useEffect(() => {
    if (base === active) return;
    let cancelled = false;
    setSwitching(true);
    const jobs = Array.from({ length: frames }, (_, i) => {
      const im = new Image();
      im.decoding = "async";
      im.src = `${base}/${i}.webp?v=${CABINE_VERSION}`;
      return im.decode().catch(() => {});
    });
    Promise.all(jobs).then(() => {
      if (cancelled) return;
      ready.current = [];
      setLoaded(0);
      setActive(base);
      setSwitching(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const wake = useCallback(() => {
    if (raf.current) return;
    const tick = () => {
      raf.current = 0;
      if (dragging.current) return;
      const nearest = Math.round(angle.current / STEP) * STEP;
      if (Math.abs(velocity.current) > 0.05) {
        angle.current += velocity.current;
        velocity.current *= FRICTION;
      } else {
        velocity.current = 0;
        const d = nearest - angle.current;
        if (Math.abs(d) < 0.15) {
          angle.current = nearest;
          paint();
          return;
        }
        angle.current += d * 0.18;
      }
      paint();
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [paint, STEP]);

  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(raf.current);
  }, [paint]);

  const spinTo = useCallback(
    (dir: 1 | -1) => {
      const cur = Math.round(angle.current / STEP) * STEP;
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      angle.current = cur;
      velocity.current = 0;
      // glide one shot over
      const target = cur + dir * STEP;
      const step = () => {
        const d = target - angle.current;
        if (Math.abs(d) < 0.2) {
          angle.current = target;
          paint();
          return;
        }
        angle.current += d * 0.2;
        paint();
        raf.current = requestAnimationFrame(step);
      };
      setTouched(true);
      raf.current = requestAnimationFrame(step);
    },
    [paint, STEP],
  );

  useEffect(() => {
    // Capture phase + stopPropagation: the room listens for these same keys to
    // step to the next piece, which would swap the product behind the cabine.
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || k === "a") {
        e.stopImmediatePropagation();
        spinTo(-1);
      } else if (e.key === "ArrowRight" || k === "d") {
        e.stopImmediatePropagation();
        spinTo(1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [spinTo]);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Pinch, double-tap, or a drag while zoomed in belong to zoom, not to spinning.
    if (zoom.down(e)) {
      dragging.current = false;
      setTouched(true);
      return;
    }
    dragging.current = true;
    lastX.current = e.clientX;
    velocity.current = 0;
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (zoom.move(e)) return;
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    angle.current -= dx * DEG_PER_PX;
    velocity.current = -dx * DEG_PER_PX;
    paint();
  };
  const onUp = (e: React.PointerEvent) => {
    zoom.up(e);
    if (!dragging.current) return;
    dragging.current = false;
    wake();
  };

  return (
    <div
      className="shop-cabine-stage"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={zoom.onWheel}
      onClick={(e) => e.stopPropagation()}
      role="img"
      aria-label={`${label} — vue à 360°, glisser pour tourner`}
    >
      <div ref={zoom.ref} className="shop-cabine-zoom">
      {Array.from({ length: frames }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          ref={(el) => {
            imgs.current[i] = el;
          }}
          src={`${active}/${i}.webp?v=${CABINE_VERSION}`}
          alt=""
          className="shop-cabine-img"
          style={{ opacity: i === 0 ? 1 : 0 }}
          draggable={false}
          decoding="async"
          onLoad={() => {
            ready.current[i] = true;
            setLoaded((n) => n + 1);
            paint();
          }}
        />
      ))}
      </div>

      <div className="shop-cabine-zoombar" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoom.zoomBy(1 / 1.5)} aria-label="Dézoomer" disabled={!zoom.zoomed}>−</button>
        <span aria-live="polite">{Math.round(zoom.scale * 100)}%</span>
        <button type="button" onClick={() => zoom.zoomBy(1.5)} aria-label="Zoomer" disabled={zoom.scale >= 4}>+</button>
        {zoom.zoomed && (
          <button type="button" onClick={zoom.reset} aria-label="Réinitialiser le zoom">⟲</button>
        )}
      </div>

      <button
        type="button"
        className="shop-cabine-arrow shop-cabine-arrow-l"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => spinTo(-1)}
        aria-label="Tourner vers la gauche"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        className="shop-cabine-arrow shop-cabine-arrow-r"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => spinTo(1)}
        aria-label="Tourner vers la droite"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div ref={flashRef} className="shop-cabine-flash" aria-hidden="true" />
      <div className="shop-cabine-shot" aria-hidden="true">
        {String(frame + 1).padStart(2, "0")} / {String(frames).padStart(2, "0")}
      </div>

      <div className="shop-cabine-dots" aria-hidden="true">
        {Array.from({ length: frames }, (_, i) => (
          <span key={i} className={i === frame ? "is-on" : undefined} />
        ))}
      </div>
      {(switching || loaded < 1) && <div className="shop-cabine-loading" aria-hidden="true" />}
      {!touched && !zoom.zoomed && loaded >= 1 && (
        <p className="shop-cabine-hint">Glissez pour tourner · pincez pour zoomer</p>
      )}
    </div>
  );
}
