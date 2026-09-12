/**
 * The experience is two back-to-back clips sharing one continuous scroll:
 *
 *   Phase "entrance"   (public/videos/entrance.mp4, ~8.04s)
 *     street -> approach -> through the open doors, ending just inside.
 *   Phase "collection" (public/videos/collection.mp4, ~7.30s)
 *     the same doorway view continuing to push in and turn to face the
 *     full clothing wall — this is where visitors browse and buy.
 *
 * Global scroll progress is 0..1 across BOTH clips; BOUNDARY is where the
 * handoff between the two <video> elements happens. Each phase also has its
 * own local 0..1 progress (used to drive that phase's video.currentTime).
 */
const ENTRANCE_DURATION = 8.04;
const COLLECTION_DURATION = 7.3;

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

/** Remap global progress into the active phase's own 0..1 timeline. */
export function localPhaseProgress(progress: number): number {
  if (progress < BOUNDARY) return progress / BOUNDARY;
  return (progress - BOUNDARY) / (1 - BOUNDARY);
}

/**
 * The security guard "stops" the visitor here (still outside, closed door)
 * to offer the fast-forward. Scroll is gated at this progress until the
 * visitor clicks through. Expressed as a fraction of the entrance phase,
 * then converted to a global fraction.
 */
const DIALOGUE_AT_LOCAL = 0.38;
export const DIALOGUE_AT = DIALOGUE_AT_LOCAL * BOUNDARY;

/** Where the guard's head sits on screen at DIALOGUE_AT, for the speech bubble's tail. */
export const GUARD_ANCHOR = { x: 30, y: 34, mobileX: 27, mobileY: 55 };

/** "Mode rapide" skips straight to the start of the collection reveal. */
export const FAST_MODE_TARGET = BOUNDARY + 0.01;

export type SceneStageLabel = "street" | "approach" | "threshold" | "collection";

export function stageForProgress(progress: number): SceneStageLabel {
  if (progress >= BOUNDARY) return "collection";
  const local = progress / BOUNDARY;
  if (local < 0.08) return "street";
  if (local < 0.3) return "approach";
  return "threshold";
}
