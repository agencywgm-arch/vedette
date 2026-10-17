"use client";

const asked = new Set<string>();

/**
 * Warms the HTTP cache with a cabine clip before it is asked for, so opening
 * it (or flipping to the women's version) starts from disk instead of the
 * network. Same URL the <video> will request: the mp4 source comes first
 * wherever it can be played, webm otherwise. Skipped on Data Saver.
 */
export function prefetchVideo(base: string, version: string) {
  if (typeof document === "undefined") return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  // the codec matters: a browser can know the mp4 container without being able to
  // decode H.264, and would then fall back to the webm source
  const ext = document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028"') ? "mp4" : "webm";
  const url = `${base}.${ext}?v=${version}`;
  if (asked.has(url)) return;
  asked.add(url);
  fetch(url, { priority: "low" } as RequestInit)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .catch(() => asked.delete(url));
}

/** Same idea for the 360° clip of a piece on the wall: webm first, as the
 *  <video> lists it, mp4 where webm can't play. */
export function prefetchTurntable(t: { mp4: string; webm?: string }) {
  if (typeof document === "undefined") return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const v = document.createElement("video");
  const url = t.webm && v.canPlayType('video/webm; codecs="vp9"') ? t.webm : t.mp4;
  if (asked.has(url)) return;
  asked.add(url);
  fetch(url, { priority: "low" } as RequestInit)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .catch(() => asked.delete(url));
}
