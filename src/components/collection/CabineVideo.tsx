"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useZoom } from "@/lib/use-zoom";
import { createVideoScrubber } from "@/lib/video-scrubber";

/** Bump when the fitting-room videos change: busts copies cached by phones. */
export const CABINE_VIDEO_VERSION = "20261015v3";
/** Degrees turned per pixel dragged: one viewport width is about a turn. */
const DEG_PER_PX = 0.45;
const FRICTION = 0.9;
/** Gentle idle spin, in degrees per second (one turn in 12 s). */
const IDLE_SPIN = 30;
const IDLE_AFTER_MS = 2200;

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * The mannequin wearing the piece, as one 360° turn on a video (front → back →
 * front). The picture is driven by an angle: dragging, the arrows, the keyboard
 * and the idle spin all just move that angle, and the video is scrubbed to it.
 * Every frame of the clip is a keyframe-dense encode so seeking either way is
 * instant.
 */
export default function CabineVideo({ src, label }: { src: string; label: string }) {
  const zoom = useZoom({ min: 1, max: 4 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrub = useRef(createVideoScrubber()).current;
  const angle = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastInput = useRef(0);
  const glide = useRef<{ to: number } | null>(null);
  const raf = useRef(0);
  const lastDraw = useRef(-1);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);

  const paint = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const a = wrap(angle.current);
    // one frame at 24 fps is the finest step the clip has
    if (Math.abs(a - lastDraw.current) < 0.4) return;
    lastDraw.current = a;
    scrub(v, Math.min(0.9995, a / 360));
  }, [scrub]);

  useEffect(() => {
    lastInput.current = performance.now();
    let prev = performance.now();
    const tick = (now: number) => {
      raf.current = requestAnimationFrame(tick);
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      if (dragging.current) return;
      if (glide.current) {
        const d = glide.current.to - angle.current;
        if (Math.abs(d) < 0.3) {
          angle.current = glide.current.to;
          glide.current = null;
        } else {
          angle.current += d * 0.16;
        }
      } else if (Math.abs(velocity.current) > 0.05) {
        angle.current += velocity.current;
        velocity.current *= FRICTION;
      } else {
        velocity.current = 0;
        if (performance.now() - lastInput.current > IDLE_AFTER_MS) {
          angle.current += IDLE_SPIN * dt;
        }
      }
      paint();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [paint]);

  // Safari needs the clip to have run once before it honours currentTime.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p) p.then(() => v.pause()).catch(() => {});
  }, [src]);

  const spinBy = useCallback((deg: number) => {
    const base = glide.current ? glide.current.to : angle.current;
    glide.current = { to: base + deg };
    velocity.current = 0;
    lastInput.current = performance.now();
    setTouched(true);
  }, []);

  useEffect(() => {
    // Capture phase + stopPropagation: the room listens for these same keys to
    // step to the next piece, which would swap the product behind the cabine.
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || k === "a") {
        e.stopImmediatePropagation();
        spinBy(-90);
      } else if (e.key === "ArrowRight" || k === "d") {
        e.stopImmediatePropagation();
        spinBy(90);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [spinBy]);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    lastInput.current = performance.now();
    if (zoom.down(e)) {
      dragging.current = false;
      setTouched(true);
      return;
    }
    dragging.current = true;
    glide.current = null;
    lastX.current = e.clientX;
    velocity.current = 0;
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (zoom.move(e)) return;
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    angle.current += dx * DEG_PER_PX;
    velocity.current = dx * DEG_PER_PX;
    lastInput.current = performance.now();
    paint();
  };
  const onUp = (e: React.PointerEvent) => {
    zoom.up(e);
    if (!dragging.current) return;
    dragging.current = false;
    lastInput.current = performance.now();
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
        <video
          ref={videoRef}
          className="shop-cabine-img"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onLoadedData={() => setReady(true)}
        >
          <source src={`${src}.webm?v=${CABINE_VIDEO_VERSION}`} type="video/webm" />
          <source src={`${src}.mp4?v=${CABINE_VIDEO_VERSION}`} type="video/mp4" />
        </video>
      </div>

      <button
        type="button"
        className="shop-cabine-arrow shop-cabine-arrow-l"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => spinBy(-90)}
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
        onClick={() => spinBy(90)}
        aria-label="Tourner vers la droite"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!ready && <div className="shop-cabine-loading" aria-hidden="true" />}
      {!touched && !zoom.zoomed && ready && (
        <p className="shop-cabine-hint">Glissez pour tourner</p>
      )}
    </div>
  );
}
