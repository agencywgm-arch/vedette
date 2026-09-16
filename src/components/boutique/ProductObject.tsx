"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import type { Product } from "@/data/products";
import { useBoutiqueStore } from "@/store/useBoutiqueStore";
import { useProductRotation } from "@/hooks/useProductRotation";

/** Where a selected item floats: between the camera's usual dolly range and
 * the display wall, dead ahead — never a hand, never a character, the
 * garment simply arrives here on its own and hangs in the air. */
export const INSPECT_POSITION: [number, number, number] = [0, 1.3, 2.2];
const CARD_HEIGHT = 1.7;
const FLY_DURATION = 1;
const RETURN_DURATION = 0.9;

export default function ProductObject({ product }: { product: Product }) {
  const groupRef = useRef<THREE.Group>(null);
  const arrivedRef = useRef(false);
  const texture = useTexture(product.image);
  const { angleRef, zoomRef, update, handlers } = useProductRotation();

  const selectedProductId = useBoutiqueStore((s) => s.selectedProductId);
  const select = useBoutiqueStore((s) => s.select);
  const hovered = useBoutiqueStore((s) => s.hoveredProductId === product.id);
  const setHovered = useBoutiqueStore((s) => s.setHovered);
  const isSelected = selectedProductId === product.id;
  const someoneElseSelected = selectedProductId !== null && !isSelected;

  const aspect = useMemo(() => {
    const img = texture.image as { width: number; height: number } | undefined;
    return img ? img.width / img.height : 1;
  }, [texture]);
  const width = CARD_HEIGHT * aspect;

  useEffect(() => {
    // Three.js texture objects are imperative GPU resource handles, not
    // React-owned state — mutating them after load is the standard r3f
    // pattern, not a violation of React's immutability rules.
    // eslint-disable-next-line react-hooks/immutability
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    gsap.killTweensOf([group.position, group.rotation, group.scale]);

    if (isSelected) {
      arrivedRef.current = false;
      angleRef.current = 0;
      zoomRef.current = 1;
      gsap.to(group.position, {
        x: INSPECT_POSITION[0],
        y: INSPECT_POSITION[1],
        z: INSPECT_POSITION[2],
        duration: FLY_DURATION,
        ease: "power3.out",
      });
      gsap.to(group.scale, {
        x: 1.5,
        y: 1.5,
        z: 1.5,
        duration: FLY_DURATION,
        ease: "power3.out",
      });
      gsap.to(group.rotation, {
        y: Math.PI * 2,
        duration: FLY_DURATION,
        ease: "power3.out",
        onComplete: () => {
          group.rotation.y = 0;
          arrivedRef.current = true;
        },
      });
    } else {
      arrivedRef.current = false;
      const [x, y, z] = product.position;
      const [rx, ry, rz] = product.rotation;
      gsap.to(group.position, { x, y, z, duration: RETURN_DURATION, ease: "power3.inOut" });
      gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: RETURN_DURATION, ease: "power3.inOut" });
      gsap.to(group.rotation, {
        x: rx,
        y: ry,
        z: rz,
        duration: RETURN_DURATION,
        ease: "power3.inOut",
      });
    }
    // angleRef/zoomRef are stable refs (exempt from deps); product/select
    // come from a stable top-level data array and a stable zustand action.
  }, [isSelected, product, angleRef, zoomRef]);

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group || !isSelected || !arrivedRef.current) return;
    update(dt);
    group.rotation.y = angleRef.current;
    const bob = Math.sin(performance.now() / 900) * 0.05;
    group.position.y = INSPECT_POSITION[1] + bob;
    group.scale.setScalar(1.5 * zoomRef.current);
  });

  return (
    <group ref={groupRef} position={product.position} rotation={product.rotation}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!someoneElseSelected) setHovered(product.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (someoneElseSelected || isSelected) return;
          select(product.id);
        }}
        scale={hovered && !isSelected ? 1.06 : 1}
        {...(isSelected ? handlers : {})}
      >
        <planeGeometry args={[width, CARD_HEIGHT]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.7}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hovered && !isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[width * 1.1, CARD_HEIGHT * 1.1]} />
          <meshBasicMaterial color="#f2c300" transparent opacity={0.16} />
        </mesh>
      )}
      {isSelected && (
        <mesh position={[0, -CARD_HEIGHT / 2 - 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[width * 0.55, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}
