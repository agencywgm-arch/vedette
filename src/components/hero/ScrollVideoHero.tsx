"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSceneStore, type EntryMode } from "@/store/useSceneStore";
import { products } from "@/data/products";
import {
  DIALOGUE_AT,
  FAST_MODE_TARGET,
  SCROLL_LENGTH_VH,
  stageForProgress,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import VideoHotspot from "./VideoHotspot";
import DialogueBubble from "./DialogueBubble";

const MOBILE_QUERY = "(max-width: 767px)";
// Intrinsic size of the vertical clip (public/videos/entrance-vertical.*),
// needed to compute its rendered rect under object-fit: contain.
const MOBILE_VIDEO_SIZE = { w: 720, h: 900 };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function subscribeMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

function animateScrollTo(targetY: number, duration = 1100) {
  const startY = window.scrollY;
  const delta = targetY - startY;
  const startTime = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, startY + delta * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function computeContainRect(containerW: number, containerH: number): ContainRect {
  const scale = Math.min(containerW / MOBILE_VIDEO_SIZE.w, containerH / MOBILE_VIDEO_SIZE.h);
  const width = MOBILE_VIDEO_SIZE.w * scale;
  const height = MOBILE_VIDEO_SIZE.h * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [containRect, setContainRect] = useState<ContainRect | null>(null);
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getMobileServerSnapshot
  );

  const started = useSceneStore((s) => s.started);
  const setScrollOffset = useSceneStore((s) => s.setScrollOffset);
  const setStage = useSceneStore((s) => s.setStage);
  const entryMode = useSceneStore((s) => s.entryMode);
  const setEntryMode = useSceneStore((s) => s.setEntryMode);
  const scrollOffset = useSceneStore((s) => s.scrollOffset);
  const lastStageRef = useRef("street");

  const showDialogue = entryMode === null && scrollOffset >= DIALOGUE_AT - 0.001;

  const handleChoose = useCallback(
    (mode: EntryMode) => {
      setEntryMode(mode);
      if (mode === "fast") {
        const wrapper = wrapperRef.current;
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          const total = rect.height - window.innerHeight;
          // rect.top is negative once scrolled into the wrapper; the wrapper's
          // own top in absolute document coordinates is window.scrollY + rect.top.
          const targetY = window.scrollY + rect.top + total * FAST_MODE_TARGET;
          animateScrollTo(targetY, 1300);
        }
      }
    },
    [setEntryMode]
  );

  // On mobile the clip is shown with object-fit: contain (never cropped), so
  // hotspots need the video's actual rendered rect within the container.
  useEffect(() => {
    if (!isMobile) return;
    const sticky = stickyRef.current;
    if (!sticky) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainRect(computeContainRect(width, height));
    });
    observer.observe(sticky);
    return () => observer.disconnect();
  }, [isMobile]);

  // Unlock scrubbing on iOS/Safari: a silent play+pause primes the video
  // so setting currentTime afterwards actually seeks instead of no-op'ing.
  useEffect(() => {
    if (!started || !videoRef.current) return;
    const video = videoRef.current;
    const primed = video.play();
    if (primed && typeof primed.then === "function") {
      primed.then(() => video.pause()).catch(() => {});
    }
  }, [started, isMobile]);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const update = () => {
      rafRef.current = null;
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const rawProgress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      // Hold at the guard's question until the visitor picks a mode.
      const progress =
        entryMode === null && rawProgress >= DIALOGUE_AT ? DIALOGUE_AT : rawProgress;
      progressRef.current = progress;

      // Read duration live instead of caching it: on some mobile browsers a
      // seek can leave the video "seeking" long enough that a stale cached
      // duration (or a currentTime write queued mid-seek) stalls scrubbing
      // entirely, so also skip writing while a previous seek is unresolved.
      const duration = video.duration || 0;
      if (duration > 0 && !video.seeking) {
        const targetTime = progress * duration;
        if (Math.abs(video.currentTime - targetTime) > 0.05) {
          video.currentTime = targetTime;
        }
      }

      setScrollOffset(progress);
      const stage = stageForProgress(progress);
      if (stage !== lastStageRef.current) {
        lastStageRef.current = stage;
        setStage(stage);
      }
    };

    const onScroll = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [setScrollOffset, setStage, isMobile, entryMode]);

  return (
    <div ref={wrapperRef} style={{ height: `${SCROLL_LENGTH_VH}vh` }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        <video
          key={isMobile ? "vertical" : "horizontal"}
          ref={videoRef}
          className={`h-full w-full ${isMobile ? "object-contain" : "object-cover"}`}
          poster={isMobile ? "/videos/poster-vertical.jpg" : "/videos/poster.jpg"}
          muted
          playsInline
          preload="auto"
        >
          {isMobile ? (
            <>
              <source src="/videos/entrance-vertical.mp4" type="video/mp4" />
              <source src="/videos/entrance-vertical.webm" type="video/webm" />
            </>
          ) : (
            <>
              <source src="/videos/entrance.mp4" type="video/mp4" />
              <source src="/videos/entrance.webm" type="video/webm" />
            </>
          )}
        </video>
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
        )}

        <DialogueBubble
          visible={showDialogue}
          isMobile={isMobile}
          containRect={containRect}
          onChoose={handleChoose}
        />

        {products.map((p) => (
          <VideoHotspotWired
            key={p.id}
            product={p}
            isMobile={isMobile}
            containRect={containRect}
          />
        ))}
      </div>
    </div>
  );
}

function VideoHotspotWired({
  product,
  isMobile,
  containRect,
}: {
  product: (typeof products)[number];
  isMobile: boolean;
  containRect: ContainRect | null;
}) {
  const progress = useSceneStore((s) => s.scrollOffset);
  return (
    <VideoHotspot
      product={product}
      progress={progress}
      isMobile={isMobile}
      containRect={containRect}
    />
  );
}
