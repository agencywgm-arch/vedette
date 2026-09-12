"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { products } from "@/data/products";
import {
  DIALOGUE_AT,
  FAST_MODE_TARGET,
  TOTAL_SCROLL_VH,
  localPhaseProgress,
  phaseForProgress,
  stageForProgress,
  type Phase,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import VideoHotspot from "./VideoHotspot";
import DialogueBubble from "./DialogueBubble";
import PhaseTransition from "./PhaseTransition";

const PHASE_TRANSITION_MIN_MS = 350;
const PHASE_TRANSITION_MAX_MS = 1500;

const MOBILE_QUERY = "(max-width: 767px)";
// Intrinsic size of the vertical clips (public/videos/*-vertical.*), needed
// to compute their rendered rect under object-fit: contain.
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

/** Set currentTime from local progress, live-reading duration and skipping
 * mid-seek writes so rapid scroll-driven seeks can't stall mobile decoders. */
function scrubVideo(video: HTMLVideoElement | null, localProgress: number) {
  if (!video) return;
  const duration = video.duration || 0;
  if (duration > 0 && !video.seeking) {
    const targetTime = localProgress * duration;
    if (Math.abs(video.currentTime - targetTime) > 0.05) {
      video.currentTime = targetTime;
    }
  }
}

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const collectionVideoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const [containRect, setContainRect] = useState<ContainRect | null>(null);
  const [activePhase, setActivePhase] = useState<Phase>("entrance");
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const lastPhaseRef = useRef<Phase>("entrance");
  const hasTransitionedRef = useRef(false);
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

  const handleFastMode = useCallback(() => {
    setEntryMode("fast");
    const wrapper = wrapperRef.current;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // rect.top is negative once scrolled into the wrapper; the wrapper's
      // own top in absolute document coordinates is window.scrollY + rect.top.
      const targetY = window.scrollY + rect.top + total * FAST_MODE_TARGET;
      animateScrollTo(targetY, 1300);
    }
  }, [setEntryMode]);

  // On mobile the clips are shown with object-fit: contain (never cropped), so
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

  // Unlock scrubbing on iOS/Safari: a silent play+pause primes each video so
  // setting currentTime afterwards actually seeks instead of no-op'ing.
  useEffect(() => {
    if (!started) return;
    for (const ref of [entranceVideoRef, collectionVideoRef]) {
      const video = ref.current;
      if (!video) continue;
      const primed = video.play();
      if (primed && typeof primed.then === "function") {
        primed.then(() => video.pause()).catch(() => {});
      }
    }
  }, [started, isMobile]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => {
      rafRef.current = null;
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const rawProgress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      // Hold at the guard's question until the visitor picks fast mode.
      const progress =
        entryMode === null && rawProgress >= DIALOGUE_AT ? DIALOGUE_AT : rawProgress;

      const phase = phaseForProgress(progress);
      const localProgress = localPhaseProgress(progress);
      scrubVideo(phase === "entrance" ? entranceVideoRef.current : null, localProgress);
      scrubVideo(phase === "collection" ? collectionVideoRef.current : null, localProgress);
      setActivePhase((prev) => (prev === phase ? prev : phase));

      // Mask the hard cut between the two clips with a brief branded loading
      // bumper the first time the visitor crosses into the collection phase.
      if (
        phase === "collection" &&
        lastPhaseRef.current === "entrance" &&
        !hasTransitionedRef.current
      ) {
        hasTransitionedRef.current = true;
        setShowPhaseTransition(true);
      }
      lastPhaseRef.current = phase;

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

  // Hold the loading bumper up until the collection clip actually has a
  // frame ready to paint, so the visitor never sees the raw poster's own
  // logo bands flash underneath it — bounded so a slow connection doesn't
  // hang the bumper forever.
  useEffect(() => {
    if (!showPhaseTransition) return;
    const video = collectionVideoRef.current;
    const start = performance.now();
    let settled = false;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      const elapsed = performance.now() - start;
      hideTimer = setTimeout(
        () => setShowPhaseTransition(false),
        Math.max(0, PHASE_TRANSITION_MIN_MS - elapsed)
      );
    };

    const maxTimer = setTimeout(finish, PHASE_TRANSITION_MAX_MS);

    if (video && video.readyState >= 3) {
      finish();
    } else if (video) {
      video.addEventListener("canplay", finish, { once: true });
    } else {
      finish();
    }

    return () => {
      clearTimeout(maxTimer);
      if (hideTimer != null) clearTimeout(hideTimer);
      video?.removeEventListener("canplay", finish);
    };
  }, [showPhaseTransition]);

  return (
    <div ref={wrapperRef} style={{ height: `${TOTAL_SCROLL_VH}vh` }} className="relative">
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        <video
          key={isMobile ? "entrance-vertical" : "entrance-horizontal"}
          ref={entranceVideoRef}
          className={`absolute inset-0 h-full w-full ${isMobile ? "object-contain" : "object-cover"}`}
          style={{ opacity: activePhase === "entrance" ? 1 : 0 }}
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
        <video
          key={isMobile ? "collection-vertical" : "collection-horizontal"}
          ref={collectionVideoRef}
          className={`absolute inset-0 h-full w-full ${isMobile ? "object-contain" : "object-cover"}`}
          style={{ opacity: activePhase === "collection" ? 1 : 0 }}
          poster={isMobile ? "/videos/collection-poster-vertical.jpg" : "/videos/collection-poster.jpg"}
          muted
          playsInline
          preload="auto"
        >
          {isMobile ? (
            <>
              <source src="/videos/collection-vertical.mp4" type="video/mp4" />
              <source src="/videos/collection-vertical.webm" type="video/webm" />
            </>
          ) : (
            <>
              <source src="/videos/collection.mp4" type="video/mp4" />
              <source src="/videos/collection.webm" type="video/webm" />
            </>
          )}
        </video>
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
        )}

        <PhaseTransition visible={showPhaseTransition} />

        <DialogueBubble
          visible={showDialogue}
          isMobile={isMobile}
          containRect={containRect}
          onChoose={handleFastMode}
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
