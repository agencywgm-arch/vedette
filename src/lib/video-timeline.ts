/**
 * The experience is two back-to-back clips sharing one continuous scroll:
 *
 *   Phase "entrance"   (public/videos/entrance.mp4, ~6.04s)
 *     street -> approach -> through the open doors, ending just inside.
 *   Phase "collection" (public/videos/collection.mp4, ~6.04s)
 *     the same doorway view continuing to push in until it settles facing
 *     the full clothing wall — this is where visitors browse and buy.
 *
 * Global scroll progress is 0..1 across BOTH clips; BOUNDARY is where the
 * handoff between the two <video> elements happens. Each phase also has its
 * own local 0..1 progress (used to drive that phase's video.currentTime).
 *
 * collection.mp4 is trimmed 1s off its master's start: the raw footage begins
 * pulled back wider than where entrance ends, so the cut popped like the
 * camera jumped backward. Frame 24 of the master is the closest match to
 * entrance's own last frame (found by comparing candidates pixel-for-pixel),
 * so that's where the trimmed file's t=0 now sits.
 */
const ENTRANCE_DURATION = 6.041667;
const COLLECTION_DURATION = 6.041667;

/** Scroll length per phase, as a multiple of the viewport height — kept
 * proportional to each clip's duration so scroll speed feels consistent. */
export const ENTRANCE_VH = 320;
export const COLLECTION_VH = Math.round(
  (ENTRANCE_VH * COLLECTION_DURATION) / ENTRANCE_DURATION
);
export const TOTAL_SCROLL_VH = ENTRANCE_VH + COLLECTION_VH;

/** Global progress (0..1) at which the entrance clip hands off to the collection clip. */
export const BOUNDARY = ENTRANCE_VH / TOTAL_SCROLL_VH;

export type Phase = "entrance" | "collection";

export function phaseForProgress(progress: number): Phase {
  return progress < BOUNDARY ? "entrance" : "collection";
}

/**
 * The security guard "stops" the visitor here (still outside, closed door)
 * to offer the fast-forward. Scroll is gated at this progress until the
 * visitor clicks through. Expressed as a fraction of the entrance phase,
 * then converted to a global fraction.
 */
const DIALOGUE_AT_LOCAL = 0.38;
export const DIALOGUE_AT = DIALOGUE_AT_LOCAL * BOUNDARY;

/** Where the guard's head sits on screen at DIALOGUE_AT, for the speech
 * bubble's tail. Desktop only — the mobile bubble is centered instead. */
export const GUARD_ANCHOR = { x: 30, y: 34 };

/** "Mode rapide" skips straight to the start of the collection reveal. */
export const FAST_MODE_TARGET = BOUNDARY + 0.01;

/**
 * The collection clip ends settled on the clothing wall. From here the crisp
 * still takes over and every piece on it becomes live. Hysteresis (enter
 * high, leave lower) keeps the handoff from flickering when scroll jitters
 * around a single threshold.
 */
export const ROOM_ENTER_AT = 0.985;
export const ROOM_LEAVE_AT = 0.955;

/** A double tap/click anywhere during the scroll skips straight past both
 * clips into the live collection room, clear of ROOM_ENTER_AT's threshold. */
export const SKIP_TO_ROOM_TARGET = Math.min(1, ROOM_ENTER_AT + 0.01);

/**
 * The letterboxed canvas the *-vertical.mp4/webm files are encoded at, and
 * where the actual shop footage sits within it. The encode pads a 4:3 frame
 * into this taller canvas with equal bars top and bottom (see the ffmpeg
 * recipe: `pad=720:900:0:(900-ih)/2`, content scaled to 540 tall) — the
 * fractions below describe that split. CollectionRoom uses these to line its
 * still photo up with exactly where the video's own picture was, not the
 * padded frame around it; ScrollVideoHero uses the outer size for hotspot
 * placement, which is expressed against the full padded canvas.
 */
export const VERTICAL_VIDEO_SIZE = { w: 720, h: 900 };

/**
 * entrance.mp4's own pixel size. GUARD_ANCHOR is expressed as a % of this
 * frame, not of whatever window is showing it — object-fit: cover crops a
 * different slice depending on the viewport's own aspect (a landscape phone
 * crops far more off the top and bottom than a 16:9 desktop does), so an
 * anchor read as plain container % drifts away from the guard on anything
 * that isn't close to that one aspect. Projecting through mediaRect's cover
 * math keeps it pinned to him regardless.
 */
export const ENTRANCE_INTRINSIC_SIZE = { w: 2048, h: 1536 };
export const VERTICAL_VIDEO_CONTENT = { topFraction: 0.2, heightFraction: 0.6 };

export type SceneStageLabel = "street" | "approach" | "threshold" | "collection";

export function stageForProgress(progress: number): SceneStageLabel {
  if (progress >= BOUNDARY) return "collection";
  const local = progress / BOUNDARY;
  if (local < 0.08) return "street";
  if (local < 0.3) return "approach";
  return "threshold";
}
