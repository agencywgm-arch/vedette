"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { createVideoScrubber } from "@/lib/video-scrubber";

/**
 * iOS won't honour a currentTime write on a <video> that has never run —
 * same constraint as the entrance clip. Muted playback needs no gesture, but
 * doing it inside one (the open that mounts this stage) is the case Safari
 * never argues with.
 */
function primeVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  const played = video.play();
  if (played && typeof played.then === "function") {
    played.then(() => video.pause()).catch(() => {});
  }
}

/**
 * A real photographed 360° turntable, scrubbed by the same angle ref the GLB
 * stage reads — drag spins it exactly like a scanned mesh would, but what's
 * turning is actual footage. One full pass through the clip is one full
 * 360°, so the unbounded angle (drag + inertia + idle auto-spin, all in
 * degrees, never clamped) just wraps modulo 360 into the clip's own 0..1.
 */
export default function TurntableStage({
  src,
  webmSrc,
  angleRef,
  zoomRef,
  bobRef,
  onReady,
}: {
  src: string;
  webmSrc?: string;
  angleRef: MutableRefObject<number>;
  zoomRef: MutableRefObject<number>;
  bobRef: MutableRefObject<number>;
  onReady?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrub = useMemo(() => createVideoScrubber(), []);

  useEffect(() => {
    primeVideo(videoRef.current);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onReady) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      onReady();
      return;
    }
    const fire = () => onReady();
    video.addEventListener("loadeddata", fire, { once: true });
    return () => video.removeEventListener("loadeddata", fire);
  }, [onReady, src]);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const video = videoRef.current;
      const wrap = wrapRef.current;
      if (video) {
        const deg = ((angleRef.current % 360) + 360) % 360;
        scrub(video, deg / 360);
      }
      if (wrap) {
        wrap.style.transform = `translateY(${bobRef.current * 100}%) scale(${zoomRef.current})`;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [angleRef, zoomRef, bobRef, scrub]);

  return (
    <div className="fp-video-stage">
      <div ref={wrapRef} className="fp-video-wrap">
        <video
          ref={videoRef}
          className="fp-video"
          style={{ pointerEvents: "none" }}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        >
          {webmSrc && <source src={webmSrc} type="video/webm" />}
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
