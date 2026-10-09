"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const CABINE_FRAMES = 8;
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
  const [loaded, setLoaded] = useState(0);

  const paint = useCallback(() => {
    const a = wrap(angle.current) / STEP;
    const lo = Math.floor(a) % frames;
    const hi = (lo + 1) % frames;
    const t = a - Math.floor(a);
    const near = Math.round(a) % frames;
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
        requestAnimationFrame(step);
      };
      setTouched(true);
      requestAnimationFrame(step);
    },
    [paint, STEP],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") spinTo(-1);
      else if (e.key === "ArrowRight") spinTo(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spinTo]);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    velocity.current = 0;
    setTouched(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    angle.current -= dx * DEG_PER_PX;
    velocity.current = -dx * DEG_PER_PX;
    paint();
  };
  const onUp = () => {
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
      onClick={(e) => e.stopPropagation()}
      role="img"
      aria-label={`${label} — vue à 360°, glisser pour tourner`}
    >
      {Array.from({ length: frames }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          ref={(el) => {
            imgs.current[i] = el;
          }}
          src={`${base}/${i}.webp`}
          alt=""
          className="shop-cabine-img"
          style={{ opacity: i === 0 ? 1 : 0 }}
          draggable={false}
          onLoad={() => setLoaded((n) => n + 1)}
        />
      ))}

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
      {!touched && loaded >= 1 && (
        <p className="shop-cabine-hint">Glissez pour tourner à 360°</p>
      )}
    </div>
  );
}
