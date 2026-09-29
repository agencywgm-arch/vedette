"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import {
  CLIP_INTRINSIC_SIZE,
  DIALOGUE_AT,
  FAST_MODE_TARGET,
  ROOM_ENTER_AT,
  ROOM_LEAVE_AT,
  SKIP_TO_ROOM_TARGET,
  TOTAL_SCROLL_VH,
  stageForProgress,
} from "@/lib/video-timeline";
import { type ContainRect } from "@/lib/overlay-position";
import { mediaRect } from "@/lib/media-rect";
import { createVideoScrubber } from "@/lib/video-scrubber";
import { useShopStore } from "@/store/useShopStore";
import CollectionRoom from "@/components/collection/CollectionRoom";
import DialogueBubble from "./DialogueBubble";

// Two clicks/taps this close together count as one double tap.
const DOUBLE_TAP_MS = 400;

// Looking around the shop: on a phone object-cover already has a crop
// margin hidden off the sides to lean into; on desktop the clip is shown in
// full (object-contain) instead, so there all the travel comes from this
// zoom-in margin. However far this reaches, the amplitude math below still
// clamps it to whatever margin the fit in use actually bought — never more
// than that, so a bigger number here only means "use more of what's already
// hidden," not a risk of ever pulling the clip's own edge into view.
const LOOK_SCALE = 1.14;
const LOOK_MAX_PX = 130;
const LOOK_EASE = 0.08;
// How far a finger has to travel before it counts as looking around rather
// than as the double tap that skips ahead.
const LOOK_DRAG_PX = 8;
/** A drag crosses this much of the screen to reach the far edge of the view. */
const LOOK_DRAG_SPAN = 0.45;

const MOBILE_QUERY = "(max-width: 767px)";
// Touch-scroll momentum covers a lot of distance per swipe, so a swipe on
// phones was blowing through several seconds of video at once. Stretching
// the scrollable distance requires more scroll per second of playback.
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

/**
 * iOS won't paint a frame — or honour a currentTime write — on a media
 * element that has never run, so the clip has to be played once before it
 * can be scrubbed. Muted playback needs no gesture, but doing it inside one
 * is the case Safari never argues with, so this gets called both on mount and
 * on the press that starts the walk-in.
 */
function primeVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  const primed = video.play();
  if (primed && typeof primed.then === "function") {
    primed.then(() => video.pause()).catch(() => {});
  }
}

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  // On mobile the letterboxed video only fills a middle band of the screen —
  // the guard's line has to stay near his own black bar, not the screen's, or
  // it drifts down into the letterbox once the video stops being full-bleed.
  const [subtitleBottomPercent, setSubtitleBottomPercent] = useState<number | null>(null);
  const [hasReachedDialogue, setHasReachedDialogue] = useState(false);
  const hasReachedDialogueRef = useRef(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const roomOpenRef = useRef(false);
  const selectedId = useShopStore((s) => s.selectedId);
  // The queue converges on the newest scroll position instead of dropping
  // updates that land while the decoder is busy.
  const scrub = useMemo(() => createVideoScrubber(), []);
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

  // Both jumps land on a bare scrollTo: the seek is fast enough not to show.
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

  // A double tap/click anywhere on the scroll phase skips straight into the
  // live collection room.
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
  // `moved` doubles as the tap guard: a press that turned into looking around
  // still ends in a click event, and that click is not a tap.
  const lookDrag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const containRectRef = useRef<ContainRect | null>(null);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);

      // Under the live room the clip is covered anyway, and a drifting
      // picture beneath it would only fight the wall for attention.
      const target = roomOpenRef.current ? { x: 0, y: 0 } : lookTarget.current;
      const current = lookCurrent.current;
      current.x += (target.x - current.x) * LOOK_EASE;
      current.y += (target.y - current.y) * LOOK_EASE;

      const layer = lookLayerRef.current;
      if (!layer) return;
      const size = containerSizeRef.current;
      const rect = containRectRef.current;
      // On desktop the clip is shown in full — nothing cropped away, so the
      // whole travel comes from the zoom margin below. On a phone it's
      // object-cover, and this recovers the crop margin that's already
      // hidden off the sides.
      const hiddenX = rect ? Math.max(0, (rect.width - size.width) / 2) : 0;
      const hiddenY = rect ? Math.max(0, (rect.height - size.height) / 2) : 0;
      const ampX = Math.min(hiddenX + (size.width * (LOOK_SCALE - 1)) / 2, LOOK_MAX_PX);
      const ampY = Math.min(hiddenY + (size.height * (LOOK_SCALE - 1)) / 2, LOOK_MAX_PX);
      const transform = `translate3d(${(-current.x * ampX).toFixed(2)}px, ${(
        -current.y * ampY
      ).toFixed(2)}px, 0) scale(${LOOK_SCALE})`;
      layer.style.transform = transform;
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
    const drag = lookDrag.current;

    // A mouse looks wherever it points; a finger drags the view with it,
    // which is the gesture that reads as leaning to see past the frame.
    if (e.pointerType === "mouse") {
      aimLook(
        ((e.clientX - bounds.left) / bounds.width - 0.5) * 2,
        ((e.clientY - bounds.top) / bounds.height - 0.5) * 2
      );
      return;
    }
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

  useEffect(() => {
    primeVideo(videoRef.current);
  }, []);

  // Desktop shows the clip in full (object-contain) — it's portrait, there's
  // no landscape footage to crop into, and pillarboxing there just reads as a
  // cinema frame. A phone's own screen is already close to the clip's own
  // aspect, though, so contain there left thick black bars top and bottom for
  // no reason; object-cover fills the screen instead, cropping a little off
  // the sides — cheap during the walk-in (nothing to click yet) and undone by
  // the settle into CollectionRoom's full, uncropped rest frame once there's
  // something on it to reach. Whichever fit is live, anything anchored to a
  // point in the picture has to be projected through mediaRect's matching
  // math against the clip's own size rather than read as a plain container %.
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!sticky) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const fit = isMobile ? "cover" : "contain";
      const rect = mediaRect(width, height, CLIP_INTRINSIC_SIZE.w, CLIP_INTRINSIC_SIZE.h, fit);
      containerSizeRef.current = { width, height };
      containRectRef.current = rect;
      // "9% up from the clip's own bottom edge", measured against the
      // letterboxed rect rather than the full screen.
      setSubtitleBottomPercent(
        ((height - (rect.top + rect.height)) + rect.height * 0.18) / height * 100
      );
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
      // The guard's question holds scroll at the door until answered.
      const heldAtDoor = entryMode === null && rawProgress >= DIALOGUE_AT;
      const progress = heldAtDoor ? DIALOGUE_AT : rawProgress;

      if (!hasReachedDialogueRef.current && entryMode === null && rawProgress >= DIALOGUE_AT) {
        hasReachedDialogueRef.current = true;
        setHasReachedDialogue(true);
      }

      scrub(videoRef.current, progress);

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
    // stop the moment the visitor holds still — so it would sit on frame zero
    // until they moved again if it became ready only after the last one.
    const video = videoRef.current;
    video?.addEventListener("loadedmetadata", onScroll);
    video?.addEventListener("loadeddata", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video?.removeEventListener("loadedmetadata", onScroll);
      video?.removeEventListener("loadeddata", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [setScrollOffset, setStage, entryMode, scrub]);

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
        {/* Everything the eye can lean into rides this layer. */}
        <div
          ref={lookLayerRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full ${isMobile ? "object-cover" : "object-contain"}`}
          // This clip is scrubbed by scroll, never actually played — a tap has
          // no business reaching it. Without pointer-events: none, a click on
          // a paused, uncontrolled <video> can trigger the browser's own
          // native play affordance (Safari shows one even with no `controls`
          // attribute once the clip has been primed), which starts it running
          // in real time and fights the scrub, looking like the scroll itself
          // just fast-forwarded to the end.
          style={{ pointerEvents: "none" }}
          poster="/videos/poster.jpg"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        >
          <source src="/videos/shop.mp4" type="video/mp4" />
          <source src="/videos/shop.webm" type="video/webm" />
        </video>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />

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

        {/* Screen-locked like a HUD element rather than pinned to the guard —
            it doesn't pan with the look-around. */}
        <DialogueBubble
          visible={showDialogue}
          onChoose={handleFastMode}
          bottomPercent={subtitleBottomPercent}
        />
      </div>
    </div>
  );
}
