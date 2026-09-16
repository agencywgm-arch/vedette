"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import {
  DIALOGUE_AT,
  FAST_MODE_TARGET,
  TOTAL_SCROLL_VH,
  phaseForProgress,
  stageForProgress,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import DialogueBubble from "./DialogueBubble";
import PhaseTransition from "./PhaseTransition";
import BoutiqueSection from "@/components/boutique/BoutiqueSection";

const PHASE_TRANSITION_MS = 600;

const MOBILE_QUERY = "(max-width: 767px)";
// Touch-scroll momentum covers a lot of distance per swipe, so a swipe on
// phones was blowing through several seconds of video at once. Stretching
// the scrollable distance keeps the same BOUNDARY fraction (both phases
// scale together) while requiring more scroll per second of playback.
const MOBILE_SCROLL_STRETCH = 1.4;
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
  const rafRef = useRef<number | null>(null);
  const [containRect, setContainRect] = useState<ContainRect | null>(null);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [hasEnteredBoutique, setHasEnteredBoutique] = useState(false);
  const hasEnteredBoutiqueRef = useRef(false);
  const [hasReachedDialogue, setHasReachedDialogue] = useState(false);
  const hasReachedDialogueRef = useRef(false);
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getMobileServerSnapshot
  );

  const setScrollOffset = useSceneStore((s) => s.setScrollOffset);
  const setStage = useSceneStore((s) => s.setStage);
  const entryMode = useSceneStore((s) => s.entryMode);
  const setEntryMode = useSceneStore((s) => s.setEntryMode);
  const lastStageRef = useRef("street");

  // Sticky once reached: the clamp below pins scroll at exactly DIALOGUE_AT,
  // so ordinary scroll jitter around that threshold was flicking scrollOffset
  // back and forth across it and making the bubble flash in and out. Once
  // the visitor has scrolled down to it, keep it up regardless of small
  // backward wobble — it only goes away once they actually answer.
  const showDialogue = entryMode === null && hasReachedDialogue;

  const handleFastMode = useCallback(() => {
    setEntryMode("fast");
    const wrapper = wrapperRef.current;
    if (wrapper) {
      // Cover the jump with the loading bumper first — an animated scroll
      // through this much of the entrance clip plays back like a jarring
      // fast-forward, so land on the collection view in one cut instead.
      setShowPhaseTransition(true);
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // rect.top is negative once scrolled into the wrapper; the wrapper's
      // own top in absolute document coordinates is window.scrollY + rect.top.
      const targetY = window.scrollY + rect.top + total * FAST_MODE_TARGET;
      window.scrollTo(0, targetY);
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

      if (!hasReachedDialogueRef.current && entryMode === null && rawProgress >= DIALOGUE_AT) {
        hasReachedDialogueRef.current = true;
        setHasReachedDialogue(true);
      }

      scrubVideo(entranceVideoRef.current, progress);

      const phase = phaseForProgress(progress);
      if (phase === "boutique" && !hasEnteredBoutiqueRef.current) {
        // One-way door: mask the video->3D handoff with the branded bumper,
        // then swap the sticky view over to the interactive boutique and
        // lock page scroll (further scroll position is meaningless once
        // navigation happens inside the boutique's own controls).
        hasEnteredBoutiqueRef.current = true;
        setShowPhaseTransition(true);
        setTimeout(() => {
          setHasEnteredBoutique(true);
          setShowPhaseTransition(false);
        }, PHASE_TRANSITION_MS);
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

  // Once inside the boutique, page scroll no longer means anything — all
  // navigation happens through the boutique's own camera controls.
  useEffect(() => {
    if (!hasEnteredBoutique) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [hasEnteredBoutique]);

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${TOTAL_SCROLL_VH * (isMobile ? MOBILE_SCROLL_STRETCH : 1)}vh` }}
      className="relative"
    >
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        {hasEnteredBoutique ? (
          <BoutiqueSection />
        ) : (
          <>
            <video
              key={isMobile ? "entrance-vertical" : "entrance-horizontal"}
              ref={entranceVideoRef}
              className={`absolute inset-0 h-full w-full ${isMobile ? "object-contain" : "object-cover"}`}
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
              onChoose={handleFastMode}
            />
          </>
        )}

        <PhaseTransition visible={showPhaseTransition} />
      </div>
    </div>
  );
}
