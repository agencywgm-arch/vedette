/**
 * The experience is one continuous clip (public/videos/shop.mp4), scrubbed
 * end to end by scroll: street -> guard at the closed door -> through it ->
 * push in until the camera settles facing the full clothing wall, where
 * visitors browse and buy.
 */
const CLIP_DURATION = 12;

/** Scroll length for the whole clip, as a multiple of the viewport height. */
export const TOTAL_SCROLL_VH = 640;

/**
 * The security guard "stops" the visitor here, closed door still between
 * them, to offer the fast-forward. Scroll is gated at this progress until
 * the visitor clicks through.
 */
export const DIALOGUE_AT = 3.0 / CLIP_DURATION;

/** "Mode rapide" skips straight past the guard to where the camera has
 * already pushed through the door into the interior. */
export const FAST_MODE_TARGET = 4.5 / CLIP_DURATION;

/**
 * The clip ends settled on the clothing wall. From here the crisp still
 * takes over and every piece on it becomes live. Hysteresis (enter high,
 * leave lower) keeps the handoff from flickering when scroll jitters around
 * a single threshold.
 */
export const ROOM_ENTER_AT = 0.985;
export const ROOM_LEAVE_AT = 0.955;

/** A double tap/click anywhere during the scroll skips straight into the
 * live collection room, clear of ROOM_ENTER_AT's threshold. */
export const SKIP_TO_ROOM_TARGET = Math.min(1, ROOM_ENTER_AT + 0.01);

/**
 * shop.mp4's own pixel size. The clip is landscape and shown in full
 * (object-fit: contain) on every breakpoint — nothing is cropped — so
 * anything anchored to a point in the picture (the look-around pan, the
 * subtitle's anchor) is projected through mediaRect's contain math against
 * this size rather than read as a plain container %.
 */
export const CLIP_INTRINSIC_SIZE = { w: 1350, h: 1080 };

export type SceneStageLabel = "street" | "approach" | "threshold" | "collection";

export function stageForProgress(progress: number): SceneStageLabel {
  if (progress < 0.05) return "street";
  if (progress < DIALOGUE_AT) return "approach";
  if (progress < FAST_MODE_TARGET) return "threshold";
  return "collection";
}
