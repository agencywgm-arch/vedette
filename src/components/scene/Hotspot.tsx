"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useScroll } from "@react-three/drei";
import { Mesh, MathUtils, Group } from "three";
import { useSceneStore } from "@/store/useSceneStore";
import type { Product } from "@/data/products";
import { REVEAL_HOTSPOTS_AT } from "@/lib/camera-path";

export default function Hotspot({ product }: { product: Product }) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const setActiveProductId = useSceneStore((s) => s.setActiveProductId);
  const scroll = useScroll();

  useFrame((_, delta) => {
    const isRevealed = scroll.offset > REVEAL_HOTSPOTS_AT;
    if (isRevealed !== revealed) setRevealed(isRevealed);
    if (groupRef.current) groupRef.current.visible = isRevealed;
    if (!meshRef.current) return;
    const targetScale = hovered ? 1.15 : 1;
    const s = MathUtils.lerp(meshRef.current.scale.x, targetScale, Math.min(1, delta * 8));
    meshRef.current.scale.setScalar(s);
  });

  return (
    <group position={product.position} ref={groupRef} visible={false}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          setActiveProductId(product.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color="#f2c300"
          emissive="#f2c300"
          emissiveIntensity={hovered ? 1.4 : 0.7}
        />
      </mesh>
      {revealed && (
        <Html distanceFactor={8} position={[0, 0.32, 0]} center occlude>
          <div className={`hotspot-badge ${hovered ? "is-hovered" : ""}`}>+</div>
        </Html>
      )}
    </group>
  );
}
