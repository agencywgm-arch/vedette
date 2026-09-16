/**
 * Driving a <video> from scroll fires seeks far faster than the decoder can
 * answer them. The obvious guard — skip the update while the decoder is busy —
 * throws away the newest position, and whatever the visitor does next is what
 * finally lands. Forward that mostly hides, because the decoder is already
 * buffered ahead. Backward it collapses: every step needs a fresh decode from a
 * keyframe, so nearly every update arrives mid-seek and is dropped, and the clip
 * turns into a handful of stills instead of running in reverse.
 *
 * So don't drop — remember. Keep only the latest target and hand it to the
 * decoder the moment it frees up, which makes the picture converge on where the
 * scroll actually is, in both directions.
 *
 * "The moment it frees up" is read off `video.seeking` rather than tracked in a
 * flag of our own. A seek that never reports back — the browser folded it into
 * another one, the buffer was evicted mid-flight — would leave a hand-kept flag
 * stuck true and the clip frozen for good. Asking the element means the next
 * scroll frame always recovers.
 */
export function createVideoScrubber() {
  let target: number | null = null;
  let bound: HTMLVideoElement | null = null;
  let onSeeked: (() => void) | null = null;

  const pump = (video: HTMLVideoElement) => {
    if (target === null || video.seeking) return;
    // HAVE_METADATA means we know the duration but have no frame to show yet;
    // seeking now just queues work the decoder can't do.
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const time = target;
    target = null;
    // Under a frame apart is under the tolerance of the eye, and re-seeking
    // there costs a decode for nothing.
    if (Math.abs(video.currentTime - time) < 0.02) return;
    video.currentTime = time;
  };

  const bind = (video: HTMLVideoElement) => {
    if (bound === video) return;
    if (bound && onSeeked) bound.removeEventListener("seeked", onSeeked);
    bound = video;
    // Scroll frames alone would already drain the queue, but they stop coming
    // the instant the visitor lifts their finger. This lands the final position
    // when the last seek finishes after that.
    onSeeked = () => pump(video);
    video.addEventListener("seeked", onSeeked);
  };

  return function scrub(video: HTMLVideoElement | null, progress: number) {
    if (!video) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    bind(video);
    target = Math.min(duration, Math.max(0, progress * duration));
    pump(video);
  };
}
