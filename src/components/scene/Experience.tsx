"use client";

import { Suspense } from "react";
import { ScrollControls } from "@react-three/drei";
import CameraRig from "./CameraRig";
import Storefront from "./Storefront";
import Interior from "./Interior";

export default function Experience() {
  return (
    <>
      <fog attach="fog" args={["#a9d3ef", 6, 26]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 10, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#bcd9f0", "#26140a", 0.4]} />

      <ScrollControls pages={4.5} damping={0.25}>
        <CameraRig />
        <Suspense fallback={null}>
          <Storefront />
          <Interior />
        </Suspense>
      </ScrollControls>
    </>
  );
}
