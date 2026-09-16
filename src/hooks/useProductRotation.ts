"use client";

import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";

const AUTO_ROTATE_SPEED = 0.35; // rad/s
const DRAG_SENSITIVITY = 0.012; // rad per px
const INERTIA_DAMPING = 0.92;
const MIN_ZOOM = 0.85;
const MAX_ZOOM = 1.45;
const ZOOM_SENSITIVITY = 0.0014;

/**
 * Drag-to-rotate (mouse/touch, unified via pointer events) with release
 * inertia that decays into the idle auto-rotate, plus wheel/pinch zoom —
 * for the single product currently floating in the inspector. Call
 * `update(dt)` once per frame (from the owning mesh's useFrame) to advance
 * rotation/inertia and read the live angle/zoom back out.
 */
export function useProductRotation() {
  const angleRef = useRef(0);
  const zoomRef = useRef(1);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    draggingRef.current = true;
    velocityRef.current = 0;
    lastXRef.current = e.nativeEvent.clientX;
    lastTRef.current = performance.now();
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const now = performance.now();
    const dt = now - lastTRef.current;
    const dx = e.nativeEvent.clientX - lastXRef.current;
    angleRef.current += dx * DRAG_SENSITIVITY;
    if (dt > 0) velocityRef.current = (dx * DRAG_SENSITIVITY) / (dt / 1000);
    lastXRef.current = e.nativeEvent.clientX;
    lastTRef.current = now;
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = false;
  };

  const onWheel = (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    zoomRef.current = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoomRef.current - e.nativeEvent.deltaY * ZOOM_SENSITIVITY)
    );
  };

  /** Advance auto-rotate + inertia decay; skipped while actively dragging. */
  const update = (dt: number) => {
    if (draggingRef.current) return;
    if (Math.abs(velocityRef.current) > 0.01) {
      angleRef.current += velocityRef.current * dt;
      velocityRef.current *= INERTIA_DAMPING;
    } else {
      velocityRef.current = 0;
      angleRef.current += AUTO_ROTATE_SPEED * dt;
    }
  };

  const reset = () => {
    angleRef.current = 0;
    zoomRef.current = 1;
    velocityRef.current = 0;
    draggingRef.current = false;
  };

  return {
    angleRef,
    zoomRef,
    update,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onWheel,
    },
  };
}
