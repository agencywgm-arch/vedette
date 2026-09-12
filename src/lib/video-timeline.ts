/**
 * The hero clip (public/videos/entrance.mp4) is an 8s push-in: it starts on
 * the street outside the storefront and ends fully inside the boutique.
 * Scroll progress (0..1) maps directly onto the clip's timeline; these
 * thresholds mark where each act roughly lands, based on the source frames.
 */
export const STAGE_THRESHOLDS = {
  approach: 0.3, // still on the sidewalk, facade in view
  threshold: 0.62, // pushing through the open doors
  interior: 1, // inside the boutique
};

/** Product hotspots only make sense once the camera has settled inside. */
export const REVEAL_HOTSPOTS_AT = 0.82;

/**
 * The security guard "stops" the visitor here (still outside, closed door)
 * to ask fast-mode-or-experience-mode. Scroll is gated at this progress
 * until the visitor answers.
 */
export const DIALOGUE_AT = 0.38;

/** Where the guard's head sits on screen at DIALOGUE_AT, for the speech bubble's tail. */
export const GUARD_ANCHOR = { x: 30, y: 34, mobileX: 27, mobileY: 55 };

/** "Mode rapide" skips ahead to roughly here — deep inside, hotspots visible. */
export const FAST_MODE_TARGET = 0.95;

/** Total scroll distance driving the clip, as a multiple of the viewport height. */
export const SCROLL_LENGTH_VH = 320;

export function stageForProgress(progress: number): "street" | "approach" | "threshold" | "interior" {
  if (progress < 0.08) return "street";
  if (progress < STAGE_THRESHOLDS.approach) return "approach";
  if (progress < STAGE_THRESHOLDS.threshold) return "threshold";
  return "interior";
}
