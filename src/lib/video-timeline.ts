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

/** Total scroll distance driving the clip, as a multiple of the viewport height. */
export const SCROLL_LENGTH_VH = 320;

export function stageForProgress(progress: number): "street" | "approach" | "threshold" | "interior" {
  if (progress < 0.08) return "street";
  if (progress < STAGE_THRESHOLDS.approach) return "approach";
  if (progress < STAGE_THRESHOLDS.threshold) return "threshold";
  return "interior";
}
