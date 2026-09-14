"use client";

import { Suspense, useEffect, type WheelEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/** The garment/cap as a thin 3D card — real geometry, not a flat image, so
 * it reads as an object even when spun near edge-on instead of going flat. */
function ProductMesh({ imageSrc }: { imageSrc: string }) {
  const texture = useTexture(imageSrc);
  useEffect(() => {
    // Three.js texture objects are imperative GPU resource handles, not
    // React-owned state — mutating them after load is the standard r3f
    // pattern, not a violation of React's immutability rules.
    // eslint-disable-next-line react-hooks/immutability
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const img = texture.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 0.8;
  const width = 2;
  const height = width / aspect;

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, 0.09]} />
      <meshStandardMaterial attach="material-0" color="#f2c300" roughness={0.4} metalness={0.3} />
      <meshStandardMaterial attach="material-1" color="#f2c300" roughness={0.4} metalness={0.3} />
      <meshStandardMaterial attach="material-2" color="#1a1a1a" roughness={0.6} metalness={0.1} />
      <meshStandardMaterial attach="material-3" color="#1a1a1a" roughness={0.6} metalness={0.1} />
      <meshStandardMaterial attach="material-4" map={texture} roughness={0.5} metalness={0.05} />
      <meshStandardMaterial attach="material-5" map={texture} roughness={0.5} metalness={0.05} />
    </mesh>
  );
}

/** Real, draggable 3D object (Three.js / react-three-fiber) — grab and spin
 * it, like inspecting a skin/loadout item, instead of a flat product photo. */
export default function ProductViewer3D({ imageSrc }: { imageSrc: string }) {
  // Interacting with the 3D object (drag-to-rotate, pinch) must not also
  // trigger the collection carousel's own wheel/swipe navigation on the
  // overlay behind it.
  const swallow = (e: WheelEvent | ReactTouchEvent) => e.stopPropagation();

  return (
    <div
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      onWheel={swallow}
      onTouchStart={swallow}
      onTouchMove={swallow}
      onTouchEnd={swallow}
    >
      <Canvas camera={{ position: [0, 0, 3.4], fov: 35 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 5]} intensity={2} castShadow />
        <directionalLight position={[-4, 1.5, -3]} intensity={0.8} color="#f2c300" />
        <directionalLight position={[0, -2, -4]} intensity={0.4} color="#4060ff" />
        <Suspense fallback={null}>
          <ProductMesh imageSrc={imageSrc} />
          <ContactShadows position={[0, -1.25, 0]} opacity={0.55} scale={6} blur={2.6} far={2.5} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2.4}
          minPolarAngle={Math.PI / 2 - 0.55}
          maxPolarAngle={Math.PI / 2 + 0.55}
        />
      </Canvas>
    </div>
  );
}
