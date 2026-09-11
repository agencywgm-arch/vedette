import { Vector3 } from "three";

export interface CameraKeyframe {
  /** scroll offset 0..1 at which this keyframe is reached */
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

/**
 * Keyframes for the scroll-driven camera dolly:
 * street -> approach -> threshold (door opens here) -> inside -> deep interior.
 */
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { t: 0.0, pos: [6.5, 2.6, 17], look: [0, 1.8, 1], fov: 45 },
  { t: 0.2, pos: [1.2, 2.1, 10], look: [0, 1.7, 1], fov: 42 },
  { t: 0.4, pos: [0, 1.65, 4.4], look: [0, 1.45, 0], fov: 40 },
  { t: 0.53, pos: [0, 1.55, 1.6], look: [0, 1.4, -2], fov: 38 },
  // interior walkway hugs x~0.8-1.3 (right of the racks, left of the counter)
  { t: 0.66, pos: [0.8, 1.6, -1.8], look: [0.5, 1.4, -6], fov: 42 },
  { t: 0.78, pos: [1.3, 1.6, -5.2], look: [-1.5, 1.4, -8], fov: 44 },
  { t: 0.9, pos: [1.3, 1.6, -8.5], look: [2.2, 1.3, -11], fov: 44 },
  { t: 1.0, pos: [0.7, 1.7, -9.8], look: [0.6, 1.4, -13.3], fov: 42 },
];

/** Door leaves start opening a bit before the threshold and are fully open by the time we pass it. */
export const DOOR_OPEN_START = 0.46;
export const DOOR_OPEN_END = 0.58;

/** Product hotspots only appear once we're properly inside, to avoid showing through the facade. */
export const REVEAL_HOTSPOTS_AT = 0.62;

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const _a = new Vector3();
const _b = new Vector3();

export function sampleKeyframes(
  offset: number,
  key: "pos" | "look",
  out: Vector3
): Vector3 {
  const frames = CAMERA_KEYFRAMES;
  let i = 0;
  while (i < frames.length - 2 && offset > frames[i + 1].t) i++;
  const f0 = frames[i];
  const f1 = frames[i + 1];
  const span = f1.t - f0.t || 1;
  const localT = smoothstep(0, 1, (offset - f0.t) / span);
  _a.set(...f0[key]);
  _b.set(...f1[key]);
  return out.copy(_a).lerp(_b, localT);
}

export function sampleFov(offset: number): number {
  const frames = CAMERA_KEYFRAMES;
  let i = 0;
  while (i < frames.length - 2 && offset > frames[i + 1].t) i++;
  const f0 = frames[i];
  const f1 = frames[i + 1];
  const span = f1.t - f0.t || 1;
  const localT = smoothstep(0, 1, (offset - f0.t) / span);
  return f0.fov + (f1.fov - f0.fov) * localT;
}
