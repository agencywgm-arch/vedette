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
  /**
   * Draws the picture at `index` — fractional positions blend the two frames
   * either side, so scrubbing glides between stills instead of stepping.
   * Returns a key that changes only when the picture on the canvas would.
   */
  draw: (ctx: CanvasRenderingContext2D, index: number) => number;
  /** The same key `draw` would return, without drawing. */
  key: (index: number) => number;
  /** Nearest frame to `index` that is ready to draw, or -1. */
  nearest: (index: number) => number;
  /** Tell the loader where the viewer is, so frames around it arrive first. */
  focus: (index: number) => void;
  destroy: () => void;
}

const CONCURRENCY = 8;
// A decoded still costs width x height x 4 bytes (8 MB at 1080p), so keeping
// all of them resident is gigabytes. Only the frames within this many of the
// viewer stay decoded, plus the coarse ones that keep the whole walk scrubbable;
// the rest are dropped and come back from the (immutable) HTTP cache on demand.
const WINDOW = 16;
const KEEP_STRIDE = 24;

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

  // Coarse pass first (every 8th frame) so the whole walk is scrubbable fast…
  const order: number[] = [];
  const queued = new Uint8Array(count);
  for (const stride of [KEEP_STRIDE]) {
    for (let i = 0; i < count; i += stride) {
      if (!queued[i]) {
        queued[i] = 1;
        order.push(i);
      }
    }
  }
  if (!queued[count - 1]) {
    queued[count - 1] = 1;
    order.splice(1, 0, count - 1);
  }
  // …then always the missing frame closest to where the viewer is looking, so
  // scrolling lands on sharp frames instead of a distant coarse neighbour.
  let focusAt = 0;
  const closestMissing = () => {
    let best = -1;
    let bestD = Infinity;
    for (let i = Math.max(0, focusAt - WINDOW); i <= Math.min(count - 1, focusAt + WINDOW); i++) {
      if (queued[i]) continue;
      const d = Math.abs(i - focusAt);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  let next = 0;
  let active = 0;
  const pump = () => {
    if (destroyed) {
      active--;
      return;
    }
    let index: number;
    if (next < order.length) index = order[next++];
    else {
      index = closestMissing();
      if (index < 0) {
        active--;
        return;
      }
      queued[index] = 1;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url(index);
    img
      .decode()
      .then(() => {
        if (destroyed) return;
        // the viewer may have moved on while this one was in flight
        if (index % KEEP_STRIDE !== 0 && index !== count - 1 && Math.abs(index - focusAt) > WINDOW) {
          queued[index] = 0;
          return;
        }
        imgs[index] = img;
        onFrame(index);
      })
      .catch(() => {})
      .finally(pump);
  };
  const kick = () => {
    while (active < CONCURRENCY && !destroyed) {
      active++;
      pump();
    }
  };
  kick();

  const nearest = (index: number) => {
    const i = Math.round(Math.min(count - 1, Math.max(0, index)));
    if (imgs[i]) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && imgs[i - d]) return i - d;
      if (i + d < count && imgs[i + d]) return i + d;
    }
    return -1;
  };

  // Blend in eighths: finer steps would redraw without anyone seeing a
  // difference, and the key lets the caller skip those redraws.
  const STEPS = 1; // no in-between blends: a mix of two moving frames ghosts and reads as blur
  const plan = (index: number) => {
    const pos = Math.min(count - 1, Math.max(0, index));
    const lo = Math.floor(pos);
    const hi = Math.min(count - 1, lo + 1);
    const step = Math.round((pos - lo) * STEPS);
    if (step === 0 || lo === hi) return { a: nearest(lo), b: -1, step: 0 };
    if (step === STEPS) return { a: nearest(hi), b: -1, step: 0 };
    if (imgs[lo] && imgs[hi]) return { a: lo, b: hi, step };
    return { a: nearest(Math.round(pos)), b: -1, step: 0 };
  };
  const keyOf = (p: { a: number; b: number; step: number }) =>
    p.a < 0 ? -1 : p.a * 1000 + (p.b >= 0 ? p.step * 100 + 1 : 0);

  const key = (index: number) => keyOf(plan(index));

  const draw = (ctx: CanvasRenderingContext2D, index: number) => {
    const p = plan(index);
    if (p.a < 0) return -1;
    const first = imgs[p.a];
    if (first) ctx.drawImage(first, 0, 0, width, height);
    if (p.b >= 0) {
      const second = imgs[p.b];
      if (second) {
        ctx.globalAlpha = p.step / STEPS;
        ctx.drawImage(second, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    }
    return keyOf(p);
  };

  const focus = (index: number) => {
    const at = Math.max(0, Math.min(count - 1, Math.round(index)));
    if (at === focusAt) return;
    focusAt = at;
    for (let i = 0; i < count; i++) {
      if (imgs[i] && i % KEEP_STRIDE !== 0 && i !== count - 1 && Math.abs(i - focusAt) > WINDOW + 8) {
        imgs[i] = null;
        queued[i] = 0;
      }
    }
    kick();
  };

  const destroy = () => {
    destroyed = true;
    // Unreferenced images are released; in-flight loads finish into nothing.
    imgs.fill(null);
  };

  return { draw, key, nearest, focus, destroy };
}
