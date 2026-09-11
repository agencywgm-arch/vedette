"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { Group } from "three";
import { DOOR_OPEN_END, DOOR_OPEN_START, smoothstep } from "@/lib/camera-path";

function DoorLeaf({ side }: { side: "left" | "right" }) {
  const pivot = useRef<Group>(null);
  const scroll = useScroll();
  const sign = side === "left" ? -1 : 1;

  useFrame(() => {
    if (!pivot.current) return;
    const openAmount = smoothstep(DOOR_OPEN_START, DOOR_OPEN_END, scroll.offset);
    pivot.current.rotation.y = sign * openAmount * (Math.PI * 0.62);
  });

  return (
    <group position={[sign * 1.0, 0, 2.02]} ref={pivot}>
      <mesh position={[sign * 0.5, 1.3, 0]} castShadow>
        <boxGeometry args={[1, 2.6, 0.06]} />
        <meshPhysicalMaterial
          color="#0a1830"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.2}
          transmission={0.4}
        />
      </mesh>
      <mesh position={[sign * 0.5, 1.05, 0.04]}>
        <boxGeometry args={[0.06, 0.1, 0.03]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function Doors() {
  return (
    <group>
      <DoorLeaf side="left" />
      <DoorLeaf side="right" />
    </group>
  );
}
