export interface ContainRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Position an overlay at (x,y) percent of the video's own frame. The video's
 * on-screen rect (containRect) rarely matches the container's own box once
 * object-fit crops or letterboxes it — cover crops a different slice
 * depending on the viewport's own aspect, contain letterboxes it — so an
 * anchor read as plain container % drifts as soon as the viewport stops
 * matching the video's aspect. Project against the measured rect instead;
 * only fall back to plain % before that first measurement lands.
 */
export function overlayPosition(
  x: number,
  y: number,
  containRect: ContainRect | null
): { left: number | string; top: number | string } {
  if (containRect) {
    return {
      left: containRect.left + (x / 100) * containRect.width,
      top: containRect.top + (y / 100) * containRect.height,
    };
  }
  return { left: `${x}%`, top: `${y}%` };
}
