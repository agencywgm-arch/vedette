"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { createFrameSequence } from "@/lib/frame-sequence";
import { useZoom } from "@/lib/use-zoom";
import { useShopStore } from "@/store/useShopStore";
import CollectionRoom from "@/components/collection/CollectionRoom";
import DialogueBubble from "./DialogueBubble";
import ScrollPrompt from "./ScrollPrompt";

// Two clicks/taps this close together count as one double tap.
const DOUBLE_TAP_MS = 400;

// Looking around the shop: the clip is shown in full (object-contain) on
// every breakpoint, so all the travel comes from this zoom-in margin rather
// than from any crop the fit already bought. However far this reaches, the
// amplitude math below still clamps it to whatever margin zooming in by
// LOOK_SCALE actually buys — never more than that, so a bigger number here
// only means "use more of what's already hidden," not a risk of ever
// pulling the clip's own edge into view.
const LOOK_SCALE = 1.06;
const LOOK_MAX_PX = 60;
const LOOK_EASE = 0.08;
// How far a finger has to travel before it counts as looking around rather
// than as the double tap that skips ahead.
const LOOK_DRAG_PX = 8;
/** A drag crosses this much of the screen to reach the far edge of the view. */
const LOOK_DRAG_SPAN = 0.45;

const MOBILE_QUERY = "(max-width: 767px)";
// The walk-in is drawn from stills (see frame-sequence.ts), one per frame of
// the 24fps source. Touch devices up to tablet size get the smaller set: the
// picture is ~400 CSS px wide on a phone, and every still saved is decode
// time and memory the scroll doesn't have to wait on.
const FRAME_COUNT = 241;
const FRAME_SETS = {
  // 4K stills (Topaz-upscaled), fetched only when the scroll comes to rest on a
  // big, fast screen: the picture a pause shows is the untouched 3840px one.
  uhd: { dir: "/frames/uhd/", w: 3840, h: 2160 },
  qhd: { dir: "/frames/qhd/", w: 2560, h: 1440 },
  hd: { dir: "/frames/hd/", w: 1920, h: 1080 },
  desk: { dir: "/frames/desk/", w: 1280, h: 720 },
  lite: { dir: "/frames/lite/", w: 1024, h: 576 },
};
// How much of the remaining distance the drawn frame closes per 60Hz tick.
// A wheel notch or a fling jumps scroll by a lot at once; easing toward it
// turns that into a glide instead of a cut.
const FRAME_EASE = 0.22;
const LITE_QUERY = "(max-width: 1024px) and (pointer: coarse)";
// Phones used to scroll 1.4x further than desktops, because one fling blew
// through several seconds of video. The walk-in is now meant to take about
// three swipes (see TOTAL_SCROLL_VH), so phones get the same length; the
// frame easing below turns a big fling into a glide instead of a cut.
const MOBILE_SCROLL_STRETCH = 1;

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

function subscribeLiteQuery(callback: () => void) {
  const mql = window.matchMedia(LITE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getLiteSnapshot() {
  return window.matchMedia(LITE_QUERY).matches;
}

const noopSubscribe = () => () => {};

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);
  // Where scroll says the walk should be, in frames, and where the canvas is
  // actually showing — the second eases toward the first.
  const targetFrame = useRef(0);
  const shownFrame = useRef(0);
  const wakeDraw = useRef<() => void>(() => {});
  const focusSeq = useRef<(i: number) => void>(() => {});
  const holdSeq = useRef<(on: boolean) => void>(() => {});
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
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getMobileServerSnapshot
  );

  const lite = useSyncExternalStore(subscribeLiteQuery, getLiteSnapshot, getMobileServerSnapshot);
  // The server can't know which set of stills to ask for; loading only
  // starts once the client has picked, so a phone never pulls the big set.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

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

  // The site always opens on the approach from outside. Without this the
  // browser puts a reload (or a back/forward return) wherever the visitor had
  // scrolled to — mid-clip, with the guard's bubble already up.
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.scrollTo(0, 0);
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.history.scrollRestoration = prev;
    };
  }, []);

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
  const zoom = useZoom({ min: 1, max: 3, doubleTap: false });
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

  // The loop only runs while the view is actually travelling toward its
  // target. A phone that never leans (no pointer to aim with) used to pay for
  // a 60Hz transform write on a full-screen video layer forever; now it's one
  // write, then nothing until something moves it again.
  const wakeLook = useRef<() => void>(() => {});

  useEffect(() => {
    let raf = 0;
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    wakeLook.current = wake;
    const frame = () => {
      raf = 0;

      // Under the live room the clip is covered anyway, and a drifting
      // picture beneath it would only fight the wall for attention.
      const target = roomOpenRef.current ? { x: 0, y: 0 } : lookTarget.current;
      const current = lookCurrent.current;
      current.x += (target.x - current.x) * LOOK_EASE;
      current.y += (target.y - current.y) * LOOK_EASE;
      const settled =
        Math.abs(target.x - current.x) < 0.0005 && Math.abs(target.y - current.y) < 0.0005;
      if (settled) {
        current.x = target.x;
        current.y = target.y;
      } else {
        raf = requestAnimationFrame(frame);
      }

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
    wake();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, []);

  const aimLook = (x: number, y: number) => {
    lookTarget.current = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    wakeLook.current();
  };

  const onLookPointerDown = (e: ReactPointerEvent) => {
    // a pinch, or a drag while zoomed in, is zoom navigation, not leaning
    if (zoom.down(e)) {
      lookDrag.current = { x: e.clientX, y: e.clientY, moved: true };
      return;
    }
    lookDrag.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onLookPointerMove = (e: ReactPointerEvent) => {
    if (zoom.move(e)) {
      if (lookDrag.current) lookDrag.current.moved = true;
      return;
    }
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
  const onLookRelease = (e?: ReactPointerEvent) => {
    if (e) zoom.up(e);
    aimLook(0, 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    // Once the room is open the walk-in is behind it: stop pulling frames so
    // the thumbnails and the wall get the whole connection.
    if (!canvas || !hydrated) return;
    // Big, high-density screens with the memory to hold the larger stills get
    // the sharper set; everything else keeps the lighter ones.
    const nav = navigator as Navigator & { deviceMemory?: number };
    // Physical pixels across the screen: the 1080p stills from 1400 up, so a
    // laptop or a phone-in-landscape never stretches a 720p picture.
    const physical = Math.max(window.screen.width, window.innerWidth) * (window.devicePixelRatio || 1);
    // Phones used to get the 1024px stills, which look soft on a 3x screen:
    // only the low-memory ones keep them, the rest get the 1280px set.
    const memory = nav.deviceMemory ?? 8;
    const set = lite
      ? memory < 4
        ? FRAME_SETS.lite
        : FRAME_SETS.desk
      : physical >= 1400 && memory >= 4
        ? FRAME_SETS.hd
        : FRAME_SETS.desk;
    // What a pause shows: 4K on a desktop-class screen with the memory for it,
    // 1440p on other capable devices, 1080p on the rest.
    // ...but never a still far bigger than the picture really is on this screen
    // (a phone shows it ~1200 device pixels wide): decoding and uploading a
    // 1440p/4K still there only costs a stall on every pause.
    const shown = canvas.clientWidth * (window.devicePixelRatio || 1);
    const sharpSet =
      !lite && physical >= 2000 && memory >= 4 && shown >= 1800
        ? FRAME_SETS.uhd
        : memory >= 4 && shown >= 1300
          ? FRAME_SETS.qhd
          : FRAME_SETS.hd;
    canvas.width = set.w;
    canvas.height = set.h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";

    let raf = 0;
    let last = 0;
    let drawn = -1;

    const seq = createFrameSequence({
      count: FRAME_COUNT,
      url: (i) => `${set.dir}${String(i).padStart(3, "0")}.webp?v=20261145`,
      width: set.w,
      height: set.h,
      // A frame that just arrived only matters if it's closer to what's on
      // screen than what's being shown in its place.
      onFrame: () => {
        if (seq.key(shownFrame.current) !== drawn) wake();
      },
    });

    let sharpTimer = 0;
    let sharpOn = false;
    let sharpFor = -1;
    let sharpReady = false;
    let destroyedSharp = false;
    const showSharp = () => {
      const el = sharpRef.current;
      if (!el) return;
      const i = Math.round(Math.min(FRAME_COUNT - 1, Math.max(0, shownFrame.current)));
      if (i === sharpFor && sharpReady) {
        el.style.transition = "opacity 0.22s ease";
        el.style.opacity = "1";
        sharpOn = true;
        return;
      }
      sharpFor = i;
      sharpReady = false;
      // Decoded off the main thread into a bitmap and blitted onto a canvas:
      // an <img> showing a big still is decoded again, synchronously, the
      // moment it's first painted (a stall of ~20 ms on a phone per pause).
      const url = `${sharpSet.dir}${String(i).padStart(3, "0")}.webp?v=20261145`;
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => createImageBitmap(blob))
        .then((bmp) => {
          // still resting on the same frame?
          if (
            destroyedSharp ||
            shownFrame.current !== targetFrame.current ||
            Math.round(shownFrame.current) !== i
          ) {
            bmp.close();
            return;
          }
          if (el.width !== bmp.width) {
            el.width = bmp.width;
            el.height = bmp.height;
          }
          el.getContext("2d")?.drawImage(bmp, 0, 0);
          bmp.close();
          sharpReady = true;
          el.style.transition = "opacity 0.22s ease";
          el.style.opacity = "1";
          sharpOn = true;
        })
        .catch(() => {});
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16.7;
      last = now;
      const target = targetFrame.current;
      let shown = shownFrame.current;
      const k = 1 - Math.pow(1 - FRAME_EASE, dt / 16.7);
      shown += (target - shown) * k;
      if (Math.abs(target - shown) < 0.02) shown = target;
      shownFrame.current = shown;

      if (!roomOpenRef.current && seq.key(shown) !== drawn) {
        drawn = seq.draw(ctx, shown);
        // An opaque canvas is black until its first frame; the poster under
        // it shows through until then.
        if (drawn >= 0) canvas.style.opacity = "1";
      }
      if (shown !== target) {
        // moving again: fall back to the scrub frames at once
        if (sharpOn) {
          sharpOn = false;
          const el = sharpRef.current;
          // gone at once: a slow fade would leave the old still ghosting over the moving picture
          if (el) {
            el.style.transition = "none";
            el.style.opacity = "0";
          }
        }
        window.clearTimeout(sharpTimer);
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
        // Come to rest: fetch the full 1080p still for this exact frame and
        // fade it in over the scrub frame, so a pause shows real detail.
        window.clearTimeout(sharpTimer);
        if (!roomOpenRef.current) sharpTimer = window.setTimeout(showSharp, 140);
      }
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    wakeDraw.current = wake;
    focusSeq.current = seq.focus;
    holdSeq.current = seq.hold;
    seq.hold(roomOpenRef.current);
    wake();

    return () => {
      destroyedSharp = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(sharpTimer);
      wakeDraw.current = () => {};
      focusSeq.current = () => {};
      holdSeq.current = () => {};
      seq.destroy();
    };
  }, [hydrated, lite]);

  // The clip is landscape (1350x1080) on every breakpoint, so it's shown in
  // full (object-contain) everywhere rather than split by device: a phone
  // screen is portrait, and cropping a landscape clip to cover one would zoom
  // in on a narrow vertical sliver of it — there's no "cheap crop" available
  // here the way there was for the old portrait clip. Anything anchored to a
  // point in the picture is still projected through mediaRect's contain math
  // against the clip's own size rather than read as a plain container %.
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!sticky) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const rect = mediaRect(width, height, CLIP_INTRINSIC_SIZE.w, CLIP_INTRINSIC_SIZE.h, "contain");
      containerSizeRef.current = { width, height };
      containRectRef.current = rect;
      wakeLook.current();
      // "7% up from the clip's own bottom edge", measured against the
      // letterboxed rect rather than the full screen.
      setSubtitleBottomPercent(
        ((height - (rect.top + rect.height)) + rect.height * 0.07) / height * 100
      );
    });
    observer.observe(sticky);
    return () => observer.disconnect();
  }, []);

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

      targetFrame.current = progress * (FRAME_COUNT - 1);
      focusSeq.current(targetFrame.current);
      wakeDraw.current();

      // Hand off to the live collection room once the clip has settled on the
      // wall; hysteresis so scroll jitter at the threshold can't strobe it.
      const wantRoom = roomOpenRef.current
        ? progress >= ROOM_LEAVE_AT
        : progress >= ROOM_ENTER_AT;
      if (wantRoom !== roomOpenRef.current) {
        roomOpenRef.current = wantRoom;
        setRoomOpen(wantRoom);
        holdSeq.current(wantRoom);
        if (!wantRoom) wakeDraw.current();
        wakeLook.current();
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
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [setScrollOffset, setStage, entryMode]);

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
        <div ref={zoom.ref} className="pointer-events-none absolute inset-0 will-change-transform" style={{ transformOrigin: "center" }}>
        <div
          ref={lookLayerRef}
          className="hero-exposure pointer-events-none absolute inset-0 will-change-transform"
        >
        {/* The poster holds the first frame until the canvas has one. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/videos/poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: 0 }}
        />
        {/* The sharp (up to 1440p) still of the frame you stopped on, faded in at rest. */}
        <canvas
          ref={sharpRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: 0, transition: "opacity 0.22s ease" }}
        />
        </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />

        {/* Catches the finger for looking around and the double tap/click
            that skips straight into the collection room — the walk-in is
            otherwise the slowest part of arriving there. */}
        {!roomOpen && (
          <div
            className="absolute inset-0 z-10"
            // pan-y rather than manipulation: a finger dragging sideways is
            // looking around, a finger dragging down is still scrolling the
            // page, and the browser keeps owning the second one. It also
            // keeps double-tap zoom off the shortcut.
            style={{ touchAction: "pan-y pinch-zoom" }}
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

        <ScrollPrompt active={!roomOpen && entryMode === null} touch={isMobile} />

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
