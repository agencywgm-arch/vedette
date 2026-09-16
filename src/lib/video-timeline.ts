/**
 * The experience opens with one scroll-scrubbed clip:
 *
 *   public/videos/entrance.mp4 (~8.04s)
 *     street -> approach -> through the open doors, ending just inside.
 *
 * Once scroll reaches the end of that clip, the page hands off to the real
 * interactive 3D boutique (src/components/boutique) — no second video, no
 * more scroll-scrubbing past that point.
 */
/** Scroll length for the entrance clip, as a multiple of the viewport height. */
export const ENTRANCE_VH = 320;
export const TOTAL_SCROLL_VH = ENTRANCE_VH;

export type Phase = "entrance" | "boutique";

/** Progress at/above which we consider the entrance clip "finished" and hand
 * off to the boutique — just under 1 to absorb rect-height rounding, so a
 * scroll or programmatic jump to the very bottom reliably crosses it. */
const BOUTIQUE_ENTER_AT = 0.995;

export function phaseForProgress(progress: number): Phase {
  return progress >= BOUTIQUE_ENTER_AT ? "boutique" : "entrance";
}

/**
 * The security guard "stops" the visitor here (still outside, closed door)
 * to offer the fast-forward. Scroll is gated at this progress until the
 * visitor clicks through.
 */
export const DIALOGUE_AT = 0.38;

/** Where the guard's head sits on screen at DIALOGUE_AT, for the speech bubble's tail. */
export const GUARD_ANCHOR = { x: 30, y: 34, mobileX: 27, mobileY: 55 };

/** "Mode rapide" skips straight to the end of the entrance clip, then into the boutique. */
export const FAST_MODE_TARGET = 1;

export type SceneStageLabel = "street" | "approach" | "threshold" | "boutique";

export function stageForProgress(progress: number): SceneStageLabel {
  if (progress >= BOUTIQUE_ENTER_AT) return "boutique";
  if (progress < 0.08) return "street";
  if (progress < 0.3) return "approach";
  return "threshold";
}
