"use client";

import { Suspense, useEffect, useMemo, type WheelEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

export type GarmentModel = "tee" | "hoodie" | "cap";

/** Push front/back-face vertices outward from the shape's centroid so a flat
 * extruded silhouette reads as a soft, puffed fabric volume instead of a
 * flat slab — most pronounced at the center, tapering to nothing at the
 * edges (which stay put, shared with the thin side wall). */
function addFabricBulge(geometry: THREE.BufferGeometry, maxBulge: number) {
  const pos = geometry.attributes.position;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pos.count; i++) {
    cx += pos.getX(i);
    cy += pos.getY(i);
  }
  cx /= pos.count;
  cy /= pos.count;

  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i) - cx, pos.getY(i) - cy);
    if (r > maxR) maxR = r;
  }

  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (Math.abs(z) < 0.05) continue; // leave the thin side wall alone
    const r = Math.hypot(pos.getX(i) - cx, pos.getY(i) - cy) / (maxR || 1);
    const falloff = Math.cos(Math.min(r, 1) * (Math.PI / 2));
    pos.setZ(i, z + Math.sign(z) * maxBulge * falloff);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function teeShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 1.24);
  s.quadraticCurveTo(0, 1.0, 0.3, 1.24);
  s.quadraticCurveTo(0.55, 1.26, 0.78, 1.2);
  s.bezierCurveTo(0.95, 1.15, 1.12, 1.0, 1.08, 0.82);
  s.bezierCurveTo(1.02, 0.68, 0.9, 0.6, 0.76, 0.52);
  s.quadraticCurveTo(0.82, 0.0, 0.84, -0.6);
  s.quadraticCurveTo(0.85, -1.0, 0.8, -1.25);
  s.quadraticCurveTo(0.4, -1.32, 0, -1.32);
  s.quadraticCurveTo(-0.4, -1.32, -0.8, -1.25);
  s.quadraticCurveTo(-0.85, -1.0, -0.84, -0.6);
  s.quadraticCurveTo(-0.82, 0.0, -0.76, 0.52);
  s.bezierCurveTo(-0.9, 0.6, -1.02, 0.68, -1.08, 0.82);
  s.bezierCurveTo(-1.12, 1.0, -0.95, 1.15, -0.78, 1.2);
  s.quadraticCurveTo(-0.55, 1.26, -0.3, 1.24);
  s.closePath();
  return s;
}

function hoodieShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.42, 1.22);
  s.bezierCurveTo(-0.42, 1.5, -0.22, 1.62, 0, 1.62);
  s.bezierCurveTo(0.22, 1.62, 0.42, 1.5, 0.42, 1.22);
  s.quadraticCurveTo(0.65, 1.28, 0.88, 1.2);
  s.bezierCurveTo(1.05, 1.13, 1.22, 0.98, 1.18, 0.78);
  s.bezierCurveTo(1.1, 0.62, 0.95, 0.55, 0.8, 0.48);
  s.quadraticCurveTo(0.88, -0.1, 0.9, -0.7);
  s.quadraticCurveTo(0.92, -1.05, 0.86, -1.32);
  s.quadraticCurveTo(0.45, -1.4, 0, -1.4);
  s.quadraticCurveTo(-0.45, -1.4, -0.86, -1.32);
  s.quadraticCurveTo(-0.92, -1.05, -0.9, -0.7);
  s.quadraticCurveTo(-0.88, -0.1, -0.8, 0.48);
  s.bezierCurveTo(-0.95, 0.55, -1.1, 0.62, -1.18, 0.78);
  s.bezierCurveTo(-1.22, 0.98, -1.05, 1.13, -0.88, 1.2);
  s.quadraticCurveTo(-0.65, 1.28, -0.42, 1.22);
  s.closePath();
  return s;
}

function brimShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.58, 0);
  s.quadraticCurveTo(-0.52, 0.38, 0, 0.42);
  s.quadraticCurveTo(0.52, 0.38, 0.58, 0);
  s.quadraticCurveTo(0.3, -0.06, 0, -0.07);
  s.quadraticCurveTo(-0.3, -0.06, -0.58, 0);
  s.closePath();
  return s;
}

const GARMENT_STYLE: Record<
  GarmentModel,
  { color: string; decal: { x: number; y: number; maxWidth: number; maxHeight: number } }
> = {
  tee: { color: "#f2ede2", decal: { x: 0, y: 0.08, maxWidth: 0.55, maxHeight: 0.6 } },
  hoodie: { color: "#8b8b93", decal: { x: 0, y: 0.02, maxWidth: 0.6, maxHeight: 0.55 } },
  cap: { color: "#141414", decal: { x: 0, y: 0.14, maxWidth: 0.34, maxHeight: 0.22 } },
};

/** A small "framed print" of the product photo — sized to fit within a
 * maxWidth x maxHeight box (like object-fit: contain) so a tall or wide
 * source crop never balloons past the garment it sits on. */
function DecalPlane({
  texture,
  x,
  y,
  z,
  maxWidth,
  maxHeight,
}: {
  texture: THREE.Texture;
  x: number;
  y: number;
  z: number;
  maxWidth: number;
  maxHeight: number;
}) {
  const img = texture.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 0.75;
  let width = maxWidth;
  let height = maxWidth / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspect;
  }
  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.6}
        metalness={0.05}
        transparent
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

/** A garment body (tee/hoodie) — a smooth-curved extruded silhouette with a
 * fabric-like puffed cross-section, not a flat slab. */
// Both silhouettes are authored much taller than the camera's frame; scale
// each down to a consistent on-screen size so they read fully inside the
// card instead of being cropped or dwarfing the product-photo decal.
const GARMENT_SCALE: Record<"tee" | "hoodie", number> = { tee: 0.58, hoodie: 0.5 };

function GarmentMesh({ model, texture }: { model: "tee" | "hoodie"; texture: THREE.Texture }) {
  const geometry = useMemo(() => {
    const shape = model === "tee" ? teeShape() : hoodieShape();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.035,
      bevelSegments: 6,
      curveSegments: 32,
    });
    geo.center();
    addFabricBulge(geo, 0.22);
    const scale = GARMENT_SCALE[model];
    geo.scale(scale, scale, scale);
    return geo;
  }, [model]);

  const style = GARMENT_STYLE[model];
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={style.color} roughness={0.85} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <DecalPlane
        texture={texture}
        x={style.decal.x}
        y={style.decal.y}
        z={0.13}
        maxWidth={style.decal.maxWidth}
        maxHeight={style.decal.maxHeight}
      />
    </group>
  );
}

/** A real 3D cap: a rounded dome crown (a sphere cap, not a flat cutout)
 * plus a curved brim jutting out the front, viewable from every angle. */
function CapMesh({ texture }: { texture: THREE.Texture }) {
  const brimGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(brimShape(), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, []);

  const style = GARMENT_STYLE.cap;
  // Dome crown: a sphere cap sitting at domeY, cut off at thetaLength — its
  // bottom rim sits at domeY + radius*cos(thetaLength). The brim is
  // positioned to tuck just under that rim so the two pieces read as one
  // continuous cap instead of two disconnected floating shapes.
  const domeY = 0.12;
  const domeRadius = 0.6;
  const thetaLength = Math.PI * 0.52;
  const domeRimY = domeY + domeRadius * Math.cos(thetaLength);
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, domeY, 0]}>
        <sphereGeometry args={[domeRadius, 36, 24, 0, Math.PI * 2, 0, thetaLength]} />
        <meshStandardMaterial color={style.color} roughness={0.75} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={brimGeometry}
        castShadow
        receiveShadow
        position={[0, domeRimY - 0.04, 0.4]}
        rotation={[-0.14, 0, 0]}
      >
        <meshStandardMaterial color={style.color} roughness={0.75} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <DecalPlane
        texture={texture}
        x={style.decal.x}
        y={style.decal.y}
        z={domeRadius + 0.02}
        maxWidth={style.decal.maxWidth}
        maxHeight={style.decal.maxHeight}
      />
    </group>
  );
}

function ProductMesh({ imageSrc, model }: { imageSrc: string; model: GarmentModel }) {
  const texture = useTexture(imageSrc);
  useEffect(() => {
    // Three.js texture objects are imperative GPU resource handles, not
    // React-owned state — mutating them after load is the standard r3f
    // pattern, not a violation of React's immutability rules.
    // eslint-disable-next-line react-hooks/immutability
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  if (model === "cap") return <CapMesh texture={texture} />;
  return <GarmentMesh model={model} texture={texture} />;
}

/** Real, draggable 3D object (Three.js / react-three-fiber) — grab and spin
 * it, like inspecting a skin/loadout item, instead of a flat product photo. */
export default function ProductViewer3D({
  imageSrc,
  model,
}: {
  imageSrc: string;
  model: GarmentModel;
}) {
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
          <ProductMesh imageSrc={imageSrc} model={model} />
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
