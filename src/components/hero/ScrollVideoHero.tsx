"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import {
  BOUNDARY,
  DIALOGUE_AT,
  FAST_MODE_TARGET,
  ROOM_ENTER_AT,
  ROOM_LEAVE_AT,
  TOTAL_SCROLL_VH,
  VERTICAL_VIDEO_SIZE,
  phaseForProgress,
  stageForProgress,
  type Phase,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import { createVideoScrubber } from "@/lib/video-scrubber";
import { useShopStore } from "@/store/useShopStore";
import CollectionRoom from "@/components/collection/CollectionRoom";
import DialogueBubble from "./DialogueBubble";

// The two clips' frames at the cut don't quite line up (the camera sits at a
// slightly different distance from the door in each), so a bare swap pops.
// This just needs to be long enough to break that pop — a fade slow enough to
// actually see reads as two images ghosting through each other, which is more
// visible than the mismatch it's covering for. Quick enough to register as a
// clean cut, not a dissolve.
const CROSSFADE_MS = 120;

const MOBILE_QUERY = "(max-width: 767px)";
// Touch-scroll momentum covers a lot of distance per swipe, so a swipe on
// phones was blowing through several seconds of video at once. Stretching
// the scrollable distance keeps the same BOUNDARY fraction (both phases
// scale together) while requiring more scroll per second of playback.
const MOBILE_SCROLL_STRETCH = 1.4;

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
  const scale = Math.min(containerW / VERTICAL_VIDEO_SIZE.w, containerH / VERTICAL_VIDEO_SIZE.h);
  const width = VERTICAL_VIDEO_SIZE.w * scale;
  const height = VERTICAL_VIDEO_SIZE.h * scale;
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
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const collectionVideoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const [containRect, setContainRect] = useState<ContainRect | null>(null);
  const [activePhase, setActivePhase] = useState<Phase>("entrance");
  const [hasReachedDialogue, setHasReachedDialogue] = useState(false);
  const hasReachedDialogueRef = useRef(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const roomOpenRef = useRef(false);
  const selectedId = useShopStore((s) => s.selectedId);
  // One queue per clip: each converges on the newest scroll position instead
  // of dropping updates that land while the decoder is busy.
  const scrubEntrance = useMemo(() => createVideoScrubber(), []);
  const scrubCollection = useMemo(() => createVideoScrubber(), []);
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
      // The jump itself needs no cover: the crossfade dissolves it exactly
      // like the natural boundary crossing does, and the seek it costs the
      // entrance clip is now fast enough (a fraction of the fade) not to show.
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

      const phase = phaseForProgress(progress);
      // Keep BOTH clips in sync with scroll at all times (each clamped to
      // its own 0..1 range), not just the currently visible one. Otherwise
      // the hidden clip sits frozen wherever it last was and has to seek —
      // with visible lag — the moment it becomes active again, which made
      // scrolling backward across the phase boundary look broken.
      const entranceLocal = clamp(progress / BOUNDARY, 0, 1);
      const collectionLocal = clamp((progress - BOUNDARY) / (1 - BOUNDARY), 0, 1);
      scrubEntrance(entranceVideoRef.current, entranceLocal);
      scrubCollection(collectionVideoRef.current, collectionLocal);
      setActivePhase((prev) => (prev === phase ? prev : phase));

      // Hand off to the live collection room once the clip has settled on the
      // wall; hysteresis so scroll jitter at the threshold can't strobe it.
      const wantRoom = roomOpenRef.current
        ? progress >= ROOM_LEAVE_AT
        : progress >= ROOM_ENTER_AT;
      if (wantRoom !== roomOpenRef.current) {
        roomOpenRef.current = wantRoom;
        setRoomOpen(wantRoom);
        // Scrolling back out of the room must also drop whatever was being
        // inspected, or its scroll lock would strand the page.
        if (!wantRoom) useShopStore.getState().select(null);
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
    // A clip that isn't decodable yet can't be scrubbed, and scroll events
    // stop the moment the visitor holds still — so a clip that becomes ready
    // after the last one would sit on frame zero until they moved again.
    const videos = [entranceVideoRef.current, collectionVideoRef.current];
    for (const video of videos) {
      video?.addEventListener("loadedmetadata", onScroll);
      video?.addEventListener("loadeddata", onScroll);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      for (const video of videos) {
        video?.removeEventListener("loadedmetadata", onScroll);
        video?.removeEventListener("loadeddata", onScroll);
      }
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [setScrollOffset, setStage, isMobile, entryMode, scrubEntrance, scrubCollection]);

  // While a piece is being inspected the wheel belongs to it (zoom), not to
  // the page — and scrolling away mid-inspection would yank the room out.
  useEffect(() => {
    if (selectedId === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedId]);

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${TOTAL_SCROLL_VH * (isMobile ? MOBILE_SCROLL_STRETCH : 1)}vh` }}
      className="relative"
    >
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        <video
          key={isMobile ? "entrance-vertical" : "entrance-horizontal"}
          ref={entranceVideoRef}
          className={`absolute inset-0 h-full w-full ${isMobile ? "object-contain" : "object-cover"}`}
          // This clip is scrubbed by scroll, never actually played — a tap has
          // no business reaching it. Without pointer-events: none, a click on
          // a paused, uncontrolled <video> can trigger the browser's own
          // native play affordance (Safari shows one even with no `controls`
          // attribute once the clip has been primed), which starts it running
          // in real time and fights the scrub, looking like the scroll itself
          // just fast-forwarded to the end.
          style={{
            opacity: activePhase === "entrance" ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            pointerEvents: "none",
          }}
          poster={isMobile ? "/videos/poster-vertical.jpg" : "/videos/poster.jpg"}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
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
          style={{
            opacity: activePhase === "collection" ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            pointerEvents: "none",
          }}
          poster={isMobile ? "/videos/collection-poster-vertical.jpg" : "/videos/collection-poster.jpg"}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
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

        {/* A tap during this phase has nothing to do — no hotspot exists until
            the room mounts — but some browsers still route it to the <video>
            underneath as a native play gesture regardless of the video's own
            pointer-events: none (a known WebKit/Chrome-on-Android quirk with
            media elements), which starts it running in real time and looks
            like the scroll itself raced ahead to the end. A plain div, with
            no such special-casing, reliably absorbs the tap instead. */}
        {!roomOpen && <div className="absolute inset-0 z-10" />}

        {/* Mounted only once the clip has settled, so the reveal plays from
            the top every time you arrive — and the long dissolve keeps it
            feeling like the camera coming to rest, not a mode switch. */}
        {roomOpen && (
          <div className="shop-reveal absolute inset-0 z-20">
            <CollectionRoom compact={isMobile} />
          </div>
        )}

        <DialogueBubble
          visible={showDialogue}
          isMobile={isMobile}
          containRect={containRect}
          onChoose={handleFastMode}
        />
      </div>
    </div>
  );
}
