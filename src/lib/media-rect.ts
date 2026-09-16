export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Spot {
  /** Centre of the box, in % of the media's own frame. */
  x: number;
  y: number;
  /** Size of the box, in % of the media's own frame. */
  w: number;
  h: number;
}

/**
 * Where a media of a given intrinsic size actually lands inside its
 * container under object-fit: cover / contain. Overlays anchored to
 * something *in the picture* have to be positioned against this rect, not
 * against the container, or they drift as soon as the viewport aspect stops
 * matching the media's.
 */
export function mediaRect(
  containerW: number,
  containerH: number,
  mediaW: number,
  mediaH: number,
  fit: "cover" | "contain"
): Rect {
  const sx = containerW / mediaW;
  const sy = containerH / mediaH;
  const scale = fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  const width = mediaW * scale;
  const height = mediaH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

/** Project a spot (in media-frame %) onto screen pixels within `rect`. */
export function spotRect(spot: Spot, rect: Rect): Rect {
  const width = (spot.w / 100) * rect.width;
  const height = (spot.h / 100) * rect.height;
  return {
    left: rect.left + (spot.x / 100) * rect.width - width / 2,
    top: rect.top + (spot.y / 100) * rect.height - height / 2,
    width,
    height,
  };
}
