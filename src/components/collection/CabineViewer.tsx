"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const CABINE_FRAMES = 16;
const STEP = 360 / CABINE_FRAMES;
/** Degrees turned per pixel dragged: one viewport width is half a turn. */
const DEG_PER_PX = 0.45;
const FRICTION = 0.92;

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * The mannequin wearing the piece, shot every 22.5° around. Dragging (or the
 * arrows / keyboard) spins it; on release it glides to the nearest shot so a
 * resting view is always a real photograph. Between shots the two nearest
 * photos cross-fade, which reads as rotation while the finger is moving.
 */
export default function CabineViewer({
  base,
  label,
}: {
  base: string;
  label: string;
}) {
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
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
    const lo = Math.floor(a) % CABINE_FRAMES;
    const hi = (lo + 1) % CABINE_FRAMES;
    const t = a - Math.floor(a);
    for (let i = 0; i < CABINE_FRAMES; i++) {
      const el = imgs.current[i];
      if (!el) continue;
      el.style.opacity = i === lo ? String(1 - t) : i === hi ? String(t) : "0";
    }
    setFrame((prev) => {
      const next = Math.round(a) % CABINE_FRAMES;
      return prev === next ? prev : next;
    });
  }, []);

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
  }, [paint]);

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
    [paint],
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
      {Array.from({ length: CABINE_FRAMES }, (_, i) => (
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

      <div className="shop-cabine-dots" aria-hidden="true">
        {Array.from({ length: CABINE_FRAMES }, (_, i) => (
          <span key={i} className={i === frame ? "is-on" : undefined} />
        ))}
      </div>
      {!touched && loaded >= 1 && (
        <p className="shop-cabine-hint">Glissez pour tourner à 360°</p>
      )}
    </div>
  );
}
