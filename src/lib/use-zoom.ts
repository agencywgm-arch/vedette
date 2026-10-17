"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent, WheelEvent as RWheelEvent } from "react";

/** Fraction of a drag that one pixel of sideways wheel / swipe turns. */
const WHEEL_SPIN = 0.5;

/**
 * Pinch / wheel / double-tap zoom with drag-to-pan, written straight to the
 * element's transform (no React render per frame). `consumes` tells the host
 * whether the gesture belongs to zoom (pinch, or a drag while zoomed in) so it
 * can keep its own one-finger behaviour (e.g. spinning) at rest.
 */
export function useZoom({
  min = 1,
  max = 4,
  doubleTap = true,
  onSpin,
}: {
  min?: number;
  max?: number;
  doubleTap?: boolean;
  /** Sideways wheel / trackpad swipe (or Shift + wheel): the host turns its
   *  piece by the equivalent of dragging this many pixels to the right. */
  onSpin?: (dx: number) => void;
} = {}) {
  const spin = useRef(onSpin);
  useEffect(() => {
    spin.current = onSpin;
  });
  const el = useRef<HTMLElement | null>(null);
  const s = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const lastTap = useRef(0);
  const [scale, setScale] = useState(1);

  const apply = useCallback(() => {
    const node = el.current;
    if (!node) return;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const mx = ((s.current - 1) * w) / 2;
    const my = ((s.current - 1) * h) / 2;
    tx.current = Math.max(-mx, Math.min(mx, tx.current));
    ty.current = Math.max(-my, Math.min(my, ty.current));
    node.style.transform = `translate(${tx.current}px, ${ty.current}px) scale(${s.current})`;
  }, []);

  const setTo = useCallback(
    (next: number, cx = 0, cy = 0) => {
      const old = s.current;
      const n = Math.max(min, Math.min(max, next));
      // keep the point under (cx, cy) — relative to the element's centre — fixed
      tx.current = cx - ((cx - tx.current) * n) / old;
      ty.current = cy - ((cy - ty.current) * n) / old;
      s.current = n;
      if (n === min) {
        tx.current = 0;
        ty.current = 0;
      }
      apply();
      setScale(Math.round(n * 100) / 100);
    },
    [apply, max, min],
  );

  const centre = (e: { clientX: number; clientY: number }) => {
    const r = el.current?.getBoundingClientRect();
    return r ? { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) } : { x: 0, y: 0 };
  };

  const reset = useCallback(() => setTo(min), [setTo, min]);
  const zoomBy = useCallback((f: number) => setTo(s.current * f), [setTo]);

  const onWheel = (e: RWheelEvent) => {
    // A sideways gesture turns the piece instead of zooming it: a trackpad
    // swipe, a tilt wheel, or Shift + wheel (some browsers report that one as
    // vertical, hence the fallback to deltaY).
    if (spin.current) {
      const dx = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (dx !== 0 && (e.shiftKey || Math.abs(dx) > Math.abs(e.deltaY) * 1.1)) {
        spin.current(-dx * WHEEL_SPIN); // a swipe is long: half a drag per pixel keeps it controllable
        return;
      }
    }
    const c = centre(e);
    setTo(s.current * Math.exp(-e.deltaY * 0.0022), c.x, c.y);
  };

  /** Returns true when the event was handled as zoom/pan. */
  const down = (e: RPointerEvent): boolean => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: s.current };
      return true;
    }
    const now = performance.now();
    if (doubleTap && now - lastTap.current < 320) {
      lastTap.current = 0;
      const c = centre(e);
      setTo(s.current > min + 0.05 ? min : Math.min(max, 2.4), c.x, c.y);
      return true;
    }
    lastTap.current = now;
    return s.current > min + 0.01;
  };

  const move = (e: RPointerEvent): boolean => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return false;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = centre({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      setTo(pinch.current.s * (d / pinch.current.d), mid.x, mid.y);
      return true;
    }
    if (s.current > min + 0.01) {
      tx.current += e.clientX - prev.x;
      ty.current += e.clientY - prev.y;
      apply();
      return true;
    }
    return false;
  };

  const up = (e: RPointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
  };

  return {
    ref: (n: HTMLElement | null) => {
      el.current = n;
      if (n) apply();
    },
    scale,
    zoomed: scale > min + 0.01,
    reset,
    zoomBy,
    onWheel,
    down,
    move,
    up,
  };
}
