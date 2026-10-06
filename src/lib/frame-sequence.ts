/**
 * The walk-in as a sequence of stills drawn onto a canvas, instead of a
 * <video> driven by currentTime. A video seek is asynchronous: Chrome hands
 * it to the decoder and paints whenever that answers, so a scroll-driven
 * clip always trails the finger by a decode and lands in steps. A still that
 * is already decoded draws in the same frame it's asked for.
 *
 * Loading is coarse-to-fine — every 16th frame first, then every 8th, and so
 * on — so the whole walk is scrubbable within the first couple of megabytes,
 * and draws fall back to the nearest frame that has arrived.
 *
 * Each still is decode()d as it arrives, so a draw is a plain blit. (A
 * sliding window of ImageBitmaps was tried and measured worse: re-creating
 * bitmaps as the window moved cost more main-thread time on a throttled
 * phone than the draws it was meant to save.)
 */
export interface FrameSequence {
  /** Draws the nearest available frame to `index`; returns the frame drawn. */
  draw: (ctx: CanvasRenderingContext2D, index: number) => number;
  /** Nearest frame to `index` that is ready to draw, or -1. */
  nearest: (index: number) => number;
  destroy: () => void;
}

const CONCURRENCY = 6;

export function createFrameSequence({
  count,
  url,
  width,
  height,
  onFrame,
}: {
  count: number;
  url: (index: number) => string;
  width: number;
  height: number;
  /** Fires as each frame arrives, so the caller can redraw if it's closer. */
  onFrame: (index: number) => void;
}): FrameSequence {
  const imgs: (HTMLImageElement | null)[] = new Array(count).fill(null);
  let destroyed = false;

  const order: number[] = [];
  const seen = new Uint8Array(count);
  for (const stride of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += stride) {
      if (!seen[i]) {
        seen[i] = 1;
        order.push(i);
      }
    }
  }
  if (!seen[count - 1]) order.splice(1, 0, count - 1);

  let next = 0;
  const pump = () => {
    if (destroyed || next >= order.length) return;
    const index = order[next++];
    const img = new Image();
    img.decoding = "async";
    img.src = url(index);
    img
      .decode()
      .then(() => {
        if (destroyed) return;
        imgs[index] = img;
        onFrame(index);
      })
      .catch(() => {})
      .finally(pump);
  };
  for (let i = 0; i < CONCURRENCY; i++) pump();

  const nearest = (index: number) => {
    const i = Math.round(Math.min(count - 1, Math.max(0, index)));
    if (imgs[i]) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && imgs[i - d]) return i - d;
      if (i + d < count && imgs[i + d]) return i + d;
    }
    return -1;
  };

  const draw = (ctx: CanvasRenderingContext2D, index: number) => {
    const i = nearest(index);
    if (i < 0) return -1;
    const img = imgs[i];
    if (img) ctx.drawImage(img, 0, 0, width, height);
    return i;
  };

  const destroy = () => {
    destroyed = true;
    // Unreferenced images are released; in-flight loads finish into nothing.
    imgs.fill(null);
  };

  return { draw, nearest, destroy };
}
