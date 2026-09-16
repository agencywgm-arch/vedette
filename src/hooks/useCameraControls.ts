"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useBoutiqueStore } from "@/store/useBoutiqueStore";

const PAN_LIMIT = 6;
const KEY_STEP = 1.6;
const DRAG_SENSITIVITY = 0.012;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Horizontal "walk along the display wall" camera control — A/D or arrow
 * keys on desktop, drag/swipe on touch. Exposes a ref (read every frame by
 * CameraController, inside the Canvas) instead of React state so panning
 * never triggers a re-render. Disabled while a product is being inspected.
 */
export function useCameraControls() {
  const targetXRef = useRef(0);
  const dragStartRef = useRef<{ x: number; startTarget: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useBoutiqueStore.getState().isInspecting) return;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        targetXRef.current = clamp(targetXRef.current - KEY_STEP, -PAN_LIMIT, PAN_LIMIT);
      } else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        targetXRef.current = clamp(targetXRef.current + KEY_STEP, -PAN_LIMIT, PAN_LIMIT);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (useBoutiqueStore.getState().isInspecting) return;
    dragStartRef.current = { x: e.clientX, startTarget: targetXRef.current };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragStartRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    targetXRef.current = clamp(drag.startTarget - dx * DRAG_SENSITIVITY, -PAN_LIMIT, PAN_LIMIT);
  };

  const onPointerUp = () => {
    dragStartRef.current = null;
  };

  return { targetXRef, panHandlers: { onPointerDown, onPointerMove, onPointerUp } };
}
