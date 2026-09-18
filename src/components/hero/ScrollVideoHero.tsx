"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import {
  BOUNDARY,
  DIALOGUE_AT,
  ENTRANCE_INTRINSIC_SIZE,
  FAST_MODE_TARGET,
  ROOM_ENTER_AT,
  ROOM_LEAVE_AT,
  SKIP_TO_ROOM_TARGET,
  TOTAL_SCROLL_VH,
  VERTICAL_VIDEO_SIZE,
  phaseForProgress,
  stageForProgress,
  type Phase,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import { mediaRect } from "@/lib/media-rect";
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

// Two clicks/taps this close together count as one double tap.
const DOUBLE_TAP_MS = 400;

// Looking around the street: both clips are 4:3, the window almost never is,
// so object-fit: cover is already hiding a band of real picture off two of the
// edges. Leaning into it is the whole trick — no extra footage, just the part
// of the frame that was being thrown away. The slight scale is what buys room
// to move on the axis that happens to fit exactly, and caps how far the eye
// travels so the clip can't ever pull its own edge into view.
const LOOK_SCALE = 1.05;
// A phone letterboxes the clip instead of cropping it, so there is no hidden
// band to lean into and the scale margin is all the travel there is. Push it
// further there: what the extra crop takes off the sides, the gesture gives
// straight back, and the rest of it grows into the bars rather than the
// picture.
const LOOK_SCALE_LETTERBOXED = 1.14;
const LOOK_MAX_PX = 64;
const LOOK_EASE = 0.08;
// How far a finger has to travel before it counts as looking around rather
// than as the double tap that skips ahead.
const LOOK_DRAG_PX = 8;
/** A drag crosses this much of the screen to reach the far edge of the view. */
const LOOK_DRAG_SPAN = 0.45;

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

  // Both jumps land on a bare scrollTo: the crossfade dissolves the cut
  // exactly like the natural boundary crossing does, and the seek it costs
  // each clip is now fast enough (a fraction of the fade) not to show.
  const jumpToProgress = useCallback((target: number) => {
    setEntryMode("fast");
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    // rect.top is negative once scrolled into the wrapper; the wrapper's own
    // top in absolute document coordinates is window.scrollY + rect.top.
    const targetY = window.scrollY + rect.top + total * target;
    window.scrollTo(0, targetY);
  }, [setEntryMode]);

  const handleFastMode = useCallback(
    () => jumpToProgress(FAST_MODE_TARGET),
    [jumpToProgress]
  );

  // A double tap/click anywhere on the scroll phase skips both clips
  // entirely and drops the visitor straight into the live collection room.
  const lastTapRef = useRef(0);
  const handleScrollTap = () => {
    // A drag that ended up looking around still ends in a click. It isn't one.
    if (lookDrag.current?.moved) {
      lookDrag.current = null;
      lastTapRef.current = 0;
      return;
    }
    const now = performance.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      jumpToProgress(SKIP_TO_ROOM_TARGET);
    } else {
      lastTapRef.current = now;
    }
  };

  // Where the eye is leaning, -1..1 per axis. Kept in refs and written
  // straight to the layer's transform: this runs on every pointer move, and
  // pushing it through React would re-render the whole hero to move a picture.
  const lookTarget = useRef({ x: 0, y: 0 });
  const lookCurrent = useRef({ x: 0, y: 0 });
  const lookLayerRef = useRef<HTMLDivElement>(null);
  const lookBubbleRef = useRef<HTMLDivElement>(null);
  // `moved` doubles as the tap guard: a press that turned into looking around
  // still ends in a click event, and that click is not a tap.
  const lookDrag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const containRectRef = useRef<ContainRect | null>(null);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      // Under the live room the clips are covered anyway, and a drifting
      // picture beneath it would only fight the wall for attention.
      const target = roomOpenRef.current ? { x: 0, y: 0 } : lookTarget.current;
      const current = lookCurrent.current;
      current.x += (target.x - current.x) * LOOK_EASE;
      current.y += (target.y - current.y) * LOOK_EASE;

      const layer = lookLayerRef.current;
      const bubbleLayer = lookBubbleRef.current;
      if (!layer) return;
      const size = containerSizeRef.current;
      const rect = containRectRef.current;
      // What cover already crops away is free to pan into; the scale margin
      // covers the axis that happens to fit the window exactly.
      const hiddenX = rect ? Math.max(0, (rect.width - size.width) / 2) : 0;
      const hiddenY = rect ? Math.max(0, (rect.height - size.height) / 2) : 0;
      // Nothing hidden on either side means the clip is being letterboxed
      // rather than cropped — no need to know which layout produced that.
      const letterboxed = hiddenX < 1 && hiddenY < 1;
      const scale = letterboxed ? LOOK_SCALE_LETTERBOXED : LOOK_SCALE;
      const ampX = Math.min(hiddenX + (size.width * (scale - 1)) / 2, LOOK_MAX_PX);
      const ampY = Math.min(hiddenY + (size.height * (scale - 1)) / 2, LOOK_MAX_PX);
      const transform = `translate3d(${(-current.x * ampX).toFixed(2)}px, ${(
        -current.y * ampY
      ).toFixed(2)}px, 0) scale(${scale})`;
      layer.style.transform = transform;
      if (bubbleLayer) bubbleLayer.style.transform = transform;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const aimLook = (x: number, y: number) => {
    lookTarget.current = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  };

  const onLookPointerDown = (e: ReactPointerEvent) => {
    lookDrag.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onLookPointerMove = (e: ReactPointerEvent) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    // A mouse looks wherever it points; a finger drags the view with it,
    // which is the gesture that reads as leaning to see past the frame.
    if (e.pointerType === "mouse") {
      aimLook(
        ((e.clientX - bounds.left) / bounds.width - 0.5) * 2,
        ((e.clientY - bounds.top) / bounds.height - 0.5) * 2
      );
      return;
    }
    const drag = lookDrag.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > LOOK_DRAG_PX || Math.abs(dy) > LOOK_DRAG_PX) drag.moved = true;
    if (!drag.moved) return;
    aimLook(-dx / (bounds.width * LOOK_DRAG_SPAN), -dy / (bounds.height * LOOK_DRAG_SPAN));
  };

  // Letting go re-centres the view, so the framing the guard's bubble is
  // anchored against is always the one it was measured against. The drag
  // itself is left in place for the click that follows to read.
  const onLookRelease = () => {
    aimLook(0, 0);
  };

  // Rotating a phone crosses the mobile query, and React swaps both <video>
  // elements for their other-orientation twins. Those replacements have never
  // been played: iOS won't paint a frame on a media element that hasn't run at
  // least once, so the clip sits on its poster and the whole walk-in looks
  // frozen for the rest of the visit. Muted playback needs no gesture, so
  // prime each new pair the way the entry screen primes the first one.
  useEffect(() => {
    for (const video of [entranceVideoRef.current, collectionVideoRef.current]) {
      if (!video) continue;
      const primed = video.play();
      if (primed && typeof primed.then === "function") {
        primed.then(() => video.pause()).catch(() => {});
      }
    }
  }, [isMobile]);

  // On mobile the clips are shown with object-fit: contain (never cropped);
  // on desktop they're cover-cropped, and how much of the frame that crops
  // away depends on the viewport's own aspect. Either way, anything anchored
  // to a point *in the picture* (mobile hotspots, the guard's speech bubble)
  // needs the video's actual rendered rect, not the container's own box.
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!sticky) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const rect = isMobile
        ? computeContainRect(width, height)
        : mediaRect(width, height, ENTRANCE_INTRINSIC_SIZE.w, ENTRANCE_INTRINSIC_SIZE.h, "cover");
      containerSizeRef.current = { width, height };
      containRectRef.current = rect;
      setContainRect(rect);
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
        {/* Everything the eye can lean into rides this layer together. It gets
            its own transform rather than one per clip, so the two never drift
            apart mid-crossfade. */}
        <div
          ref={lookLayerRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
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
        </div>
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
        )}

        {/* A single tap during this phase has nothing to do — no hotspot
            exists until the room mounts — but some browsers still route it
            to the <video> underneath as a native play gesture regardless of
            the video's own pointer-events: none (a known WebKit/
            Chrome-on-Android quirk with media elements), which starts it
            running in real time and looks like the scroll itself raced
            ahead to the end. A plain div, with no such special-casing,
            reliably absorbs the tap instead — and doubles as the double
            tap/click shortcut straight into the collection room, since the
            video is otherwise the slowest part of arriving there. */}
        {!roomOpen && (
          <div
            className="absolute inset-0 z-10"
            // pan-y rather than manipulation: a finger dragging sideways is
            // looking around, a finger dragging down is still scrolling the
            // page, and the browser keeps owning the second one. It also
            // keeps double-tap zoom off the shortcut.
            style={{ touchAction: "pan-y" }}
            onClick={handleScrollTap}
            onPointerDown={onLookPointerDown}
            onPointerMove={onLookPointerMove}
            onPointerUp={onLookRelease}
            onPointerCancel={onLookRelease}
            onPointerLeave={onLookRelease}
          />
        )}

        {/* Mounted only once the clip has settled, so the reveal plays from
            the top every time you arrive — and the long dissolve keeps it
            feeling like the camera coming to rest, not a mode switch. */}
        {roomOpen && (
          <div className="shop-reveal absolute inset-0 z-20">
            <CollectionRoom compact={isMobile} />
          </div>
        )}

        {/* The bubble is pinned to a point in the picture, so it leans with
            it. Its own layer rather than the clips' one: a transform opens a
            stacking context, and inside theirs the bubble would fall behind
            the tap absorber and stop being clickable. */}
        <div
          ref={lookBubbleRef}
          className="pointer-events-none absolute inset-0 z-30 will-change-transform"
        >
          <DialogueBubble
            visible={showDialogue}
            isMobile={isMobile}
            containRect={containRect}
            onChoose={handleFastMode}
          />
        </div>
      </div>
    </div>
  );
}
