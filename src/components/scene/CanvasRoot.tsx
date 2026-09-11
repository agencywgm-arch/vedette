"use client";

import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";

export default function CanvasRoot() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas shadows camera={{ position: [6.5, 2.6, 17], fov: 45, near: 0.1, far: 60 }}>
        <Experience />
      </Canvas>
    </div>
  );
}
