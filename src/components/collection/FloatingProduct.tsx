"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { CollectionItem } from "@/data/collection";
import type { Rect } from "@/lib/media-rect";
import { useShopStore } from "@/store/useShopStore";

// three.js is a big download and most of the wall is still flat packshots, so
// it only arrives once a piece that actually has a model is opened.
const ModelStage = dynamic(() => import("./ModelStage"), { ssr: false });

const FLY_IN_MS = 1000;
const FLY_BACK_MS = 800;
const BOB_AMPLITUDE = 7; // px
const BOB_PERIOD_MS = 2600;
const AUTO_SPIN = 14; // deg/s
const DRAG_PER_PX = 0.42; // deg
const INERTIA_DAMPING = 0.94;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.8;
const BOX_ASPECT = 0.92; // width / height of the floating stage

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Where the piece comes to rest, centred and floating clear of the UI. */
function restRect(container: { width: number; height: number }, compact: boolean): Rect {
  const height = clamp(container.height * (compact ? 0.44 : 0.52), 180, 560);
  const width = height * BOX_ASPECT;
  return {
    left: container.width / 2 - width / 2,
    top: container.height * (compact ? 0.34 : 0.46) - height / 2,
    width,
    height,
  };
}

/**
 * The piece lifts off the wall on its own — no hand, no arm, no model — glides
 * to the middle of the room and hangs there, turning slowly. Drag spins it
 * (front to back), the wheel or a pinch pushes in, and closing sends it back
 * to the exact spot it came from.
 */
export default function FloatingProduct({
  item,
  origin,
  container,
  closing,
  compact,
  zoomRef,
  onReturned,
}: {
  item: CollectionItem;
  origin: Rect;
  container: { width: number; height: number };
  closing: boolean;
  compact: boolean;
  /** Shared with the room so W / S can push in from the keyboard too. */
  zoomRef: MutableRefObject<number>;
  onReturned: () => void;
}) {
  const bundleAccessory = useShopStore((s) => s.bundleAccessory);
  // A scanned piece is a megabyte or two that only starts downloading when
  // it's opened, and three.js has to arrive before any of it can be drawn.
  // Flying an empty box to the middle of the room while that happens is the
  // one moment the illusion drops, so the flat packshot makes the trip
  // instead and dissolves into the real mesh once there is one.
  const [modelReady, setModelReady] = useState(false);
  const onModelReady = useCallback(() => setModelReady(true), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLImageElement>(null);
  const backRef = useRef<HTMLImageElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);

  // Live animation state, kept out of React so every frame is a style write
  // rather than a re-render.
  const angle = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const settled = useRef(false);
  // The float, in model units rather than pixels, for the 3D path to read.
  const bobRef = useRef(0);

  // The animation loop is mounted once and reads the newest props off these
  // mirrors, so a resize or a close never restarts the flight mid-air.
  const originRef = useRef(origin);
  const containerRef = useRef(container);
  const compactRef = useRef(compact);
  const closingRef = useRef(closing);
  const onReturnedRef = useRef(onReturned);
  const itemBackRef = useRef(item.back);
  const has3dRef = useRef(Boolean(item.model));

  useEffect(() => {
    originRef.current = origin;
    containerRef.current = container;
    compactRef.current = compact;
    closingRef.current = closing;
    onReturnedRef.current = onReturned;
    itemBackRef.current = item.back;
    has3dRef.current = Boolean(item.model);
  });

  useEffect(() => {
    const box = boxRef.current;
    // `spin` only exists on the flat-packshot path; the 3D one has no such
    // element, and requiring it here stopped the flight from ever starting.
    const spin = spinRef.current;
    if (!box) return;

    const startedAt = performance.now();
    let backStartedAt: number | null = null;
    let backFrom: Rect | null = null;
    let done = false;
    let raf = 0;

    const lerpRect = (a: Rect, b: Rect, k: number): Rect => ({
      left: a.left + (b.left - a.left) * k,
      top: a.top + (b.top - a.top) * k,
      width: a.width + (b.width - a.width) * k,
      height: a.height + (b.height - a.height) * k,
    });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rest = restRect(containerRef.current, compactRef.current);

      let rect: Rect;
      let arrived = false;

      if (closingRef.current) {
        if (backStartedAt === null) {
          backStartedAt = now;
          backFrom = lerpRect(
            originRef.current,
            rest,
            easeOutCubic(clamp((now - startedAt) / FLY_IN_MS, 0, 1))
          );
        }
        const t = clamp((now - backStartedAt) / FLY_BACK_MS, 0, 1);
        rect = lerpRect(backFrom as Rect, originRef.current, easeInOutCubic(t));
        // unwind the spin and the zoom on the way home
        angle.current *= 1 - easeInOutCubic(t) * 0.5;
        zoomRef.current += (1 - zoomRef.current) * easeInOutCubic(t) * 0.25;
        if (t >= 1 && !done) {
          done = true;
          onReturnedRef.current();
        }
      } else {
        const t = clamp((now - startedAt) / FLY_IN_MS, 0, 1);
        rect = lerpRect(originRef.current, rest, easeOutCubic(t));
        arrived = t >= 1;
        if (arrived) settled.current = true;
      }

      box.style.left = `${rect.left}px`;
      box.style.top = `${rect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;

      // spin: drag wins, then its inertia, then the idle turntable
      const dt = 1 / 60;
      if (!dragging.current && !closingRef.current) {
        if (Math.abs(velocity.current) > 1) {
          angle.current += velocity.current * dt;
          velocity.current *= INERTIA_DAMPING;
        } else {
          velocity.current = 0;
          if (settled.current) angle.current += AUTO_SPIN * dt;
        }
      }

      const bob = settled.current && !closingRef.current
        ? Math.sin(now / BOB_PERIOD_MS * Math.PI * 2) * BOB_AMPLITUDE
        : 0;
      bobRef.current = rect.height > 0 ? bob / rect.height : 0;

      // A real model reads angle, zoom and bob off the refs and turns itself;
      // there is nothing here to transform.
      if (has3dRef.current || !spin) return;

      spin.style.transform = `translateY(${bob}px) scale(${zoomRef.current}) rotateY(${angle.current}deg)`;

      // The key light stays put while the piece turns under it, so the faces
      // dim as they swing edge-on. Shading via filter (not an overlay) keeps
      // the garment's cut-out alpha intact — no dark rectangle around it.
      const rad = (angle.current * Math.PI) / 180;
      const lit = 1 - Math.abs(Math.sin(rad)) * 0.42;
      const shadow = `drop-shadow(0 ${26 + bob}px 30px rgba(0,0,0,0.55))`;
      if (frontRef.current) frontRef.current.style.filter = `brightness(${lit}) ${shadow}`;
      if (backRef.current) {
        backRef.current.style.filter = itemBackRef.current
          ? `brightness(${lit}) ${shadow}`
          : `brightness(${lit * 0.55}) saturate(0.6) ${shadow}`;
      }
      if (groundRef.current) {
        const lift = (bob + BOB_AMPLITUDE) / (BOB_AMPLITUDE * 2); // 0..1
        groundRef.current.style.transform = `translateX(-50%) scale(${1.04 - lift * 0.12})`;
        groundRef.current.style.opacity = `${(settled.current ? 0.9 : 0) * (1 - lift * 0.25)}`;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [zoomRef]);

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
      dragging.current = false;
      return;
    }
    dragging.current = true;
    velocity.current = 0;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomRef.current = clamp(
        (pinchStart.current.zoom * dist) / (pinchStart.current.dist || 1),
        MIN_ZOOM,
        MAX_ZOOM
      );
      return;
    }

    if (!dragging.current) return;
    const now = performance.now();
    const dx = e.clientX - lastX.current;
    const dt = now - lastT.current;
    angle.current += dx * DRAG_PER_PX;
    if (dt > 0) velocity.current = (dx * DRAG_PER_PX * 1000) / dt;
    lastX.current = e.clientX;
    lastT.current = now;
  };

  const endPointer = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragging.current = false;
  };

  const onWheel = (e: ReactWheelEvent) => {
    zoomRef.current = clamp(zoomRef.current - e.deltaY * 0.0012, MIN_ZOOM, MAX_ZOOM);
  };

  const back = item.back ?? item.front;

  return (
    <div
      ref={boxRef}
      className="fp-box"
      style={{ left: origin.left, top: origin.top, width: origin.width, height: origin.height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
    >
      {!item.model && <div ref={groundRef} className="fp-ground" />}
      {item.model ? (
        <>
          {item.front && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="fp-model-standin"
              style={{ opacity: modelReady ? 0 : 1 }}
              src={item.front}
              alt={item.name}
              draggable={false}
            />
          )}
          <ModelStage
            url={item.model}
            angleRef={angle}
            zoomRef={zoomRef}
            bobRef={bobRef}
            accessoryUrl={bundleAccessory ? item.accessory?.model : null}
            onReady={onModelReady}
          />
        </>
      ) : (
      <div className="fp-stage">
        <div ref={spinRef} className="fp-spin">
          {item.front && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={frontRef}
              className="fp-face fp-front"
              src={item.front}
              alt={item.name}
              draggable={false}
            />
          )}
          {back && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={backRef}
              className="fp-face fp-back"
              src={back}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}
