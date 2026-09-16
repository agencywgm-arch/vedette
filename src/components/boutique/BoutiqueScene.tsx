"use client";

import { Canvas } from "@react-three/fiber";
import type { MutableRefObject } from "react";
import Lighting from "./Lighting";
import Floor from "./Floor";
import Walls from "./Walls";
import ClothingDisplay from "./ClothingDisplay";
import CameraController from "./CameraController";

export default function BoutiqueScene({
  targetXRef,
}: {
  targetXRef: MutableRefObject<number>;
}) {
  return (
    <Canvas camera={{ position: [0, 1.6, 5.5], fov: 50 }} gl={{ antialias: true }} dpr={[1, 1.75]}>
      <color attach="background" args={["#0b0906"]} />
      <fog attach="fog" args={["#0b0906", 9, 21]} />
      <Lighting />
      <Floor />
      <Walls />
      <ClothingDisplay />
      <CameraController targetXRef={targetXRef} />
    </Canvas>
  );
}
