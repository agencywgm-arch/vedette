export interface ContainRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Position an overlay at (x,y) percent of the video frame. On mobile the
 * clip renders with object-fit: contain, so its on-screen rect (containRect)
 * rarely matches the container's own box — position against that rect
 * instead of plain container percentages there.
 */
export function overlayPosition(
  x: number,
  y: number,
  isMobile: boolean,
  containRect: ContainRect | null
): { left: number | string; top: number | string } {
  if (isMobile && containRect) {
    return {
      left: containRect.left + (x / 100) * containRect.width,
      top: containRect.top + (y / 100) * containRect.height,
    };
  }
  return { left: `${x}%`, top: `${y}%` };
}

/** Size an overlay as a percentage of the video frame, matching overlayPosition's units. */
export function overlaySize(
  widthPercent: number,
  heightPercent: number,
  isMobile: boolean,
  containRect: ContainRect | null
): { width: number | string; height: number | string } {
  if (isMobile && containRect) {
    return {
      width: (widthPercent / 100) * containRect.width,
      height: (heightPercent / 100) * containRect.height,
    };
  }
  return { width: `${widthPercent}%`, height: `${heightPercent}%` };
}
