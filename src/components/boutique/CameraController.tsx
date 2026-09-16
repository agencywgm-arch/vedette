"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { MutableRefObject } from "react";

const WALL_Y = 1.3;
const WALL_Z = -3;

/** Smooth horizontal dolly toward targetXRef.current — frame-rate
 * independent damping (no jitter/shake), always looking straight at the
 * display wall as it glides sideways. */
export default function CameraController({
  targetXRef,
}: {
  targetXRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();

  // `camera` is a Three.js imperative object (an r3f/GPU handle), not
  // React-owned state — mutating it every frame inside useFrame is the
  // standard r3f pattern for driving a scene camera, not a React
  // immutability issue.
  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    const lerp = 1 - Math.pow(0.0025, dt);
    // eslint-disable-next-line react-hooks/immutability
    camera.position.x += (targetXRef.current - camera.position.x) * lerp;
    camera.lookAt(camera.position.x, WALL_Y, WALL_Z);
  });

  return null;
}
