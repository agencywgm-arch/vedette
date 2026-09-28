"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Fetching and parsing a GLB takes real time — this is what a click was
 * waiting on. Call this as early as there's spare time to spend (the room
 * arriving, a hotspot under the pointer) so the file is already in drei's
 * cache by the time a click actually asks for it.
 */
export function preloadModel(url: string) {
  useGLTF.preload(url);
}

/**
 * A scanned piece can come out of the scanner at any scale, off-centre, facing
 * anywhere. Rather than hand-tuning each one in the data, the model is measured
 * on load and normalised: centred on its own bounding box and scaled so its
 * largest dimension is 1. Everything downstream can then treat every piece as
 * the same size, and a new model drops in with no numbers to tweak.
 */
function Piece({
  url,
  angleRef,
  zoomRef,
  bobRef,
  offsetX = 0,
  scaleFactor = 1,
  onReady,
}: {
  url: string;
  angleRef: MutableRefObject<number>;
  zoomRef: MutableRefObject<number>;
  bobRef: MutableRefObject<number>;
  /** Side-by-side placement when a companion accessory shares the stage. */
  offsetX?: number;
  scaleFactor?: number;
  /** Fires once the mesh is on screen, so the loading spinner can step aside. */
  onReady?: () => void;
}) {
  const { scene } = useGLTF(url);
  const pivot = useRef<THREE.Group>(null);

  // One clone per mount: useGLTF caches the scene, and two viewers sharing it
  // would fight over the same transforms.
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const largest = Math.max(size.x, size.y, size.z) || 1;
    copy.position.sub(centre);
    copy.scale.setScalar(1 / largest);
    copy.position.multiplyScalar(1 / largest);
    return copy;
  }, [scene]);

  // useGLTF suspends until the file is parsed, so reaching this point already
  // means the mesh exists — one frame's grace is just to let it be drawn
  // before the loading spinner steps aside.
  useEffect(() => {
    if (!onReady) return;
    const raf = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(raf);
  }, [onReady]);

  useFrame(() => {
    const group = pivot.current;
    if (!group) return;
    group.rotation.y = (angleRef.current * Math.PI) / 180;
    group.position.y = bobRef.current;
    group.position.x = offsetX;
    group.scale.setScalar(zoomRef.current * scaleFactor);
  });

  return (
    <group ref={pivot}>
      <primitive object={model} />
    </group>
  );
}

/**
 * The garment hanging in mid-air, turning. The flight across the room is still
 * the DOM box around this canvas — only what's inside it changes.
 */
export default function ModelStage({
  url,
  angleRef,
  zoomRef,
  bobRef,
  accessoryUrl,
  onReady,
}: {
  url: string;
  angleRef: MutableRefObject<number>;
  zoomRef: MutableRefObject<number>;
  bobRef: MutableRefObject<number>;
  /** A free companion piece shown turning beside this one, when opted in. */
  accessoryUrl?: string | null;
  /** Fires once the mesh is on screen, so the loading spinner can step aside. */
  onReady?: () => void;
}) {
  const paired = Boolean(accessoryUrl);
  return (
    <Canvas
      className="fp-canvas"
      // The piece never fills the frame edge to edge, so alpha keeps the room
      // visible around it exactly as the cut-out packshots did.
      // On a GPU that falls back to software rendering (no hardware
      // acceleration — a known state on some laptops, VMs and locked-down
      // corporate machines), this canvas was the whole page's bottleneck:
      // independently measured, opening a piece dropped requestAnimationFrame
      // from a steady 60/s to under 2/s, which reads as a still image, not a
      // turntable that's merely slow. No antialiasing and a capped pixel
      // ratio roughly halve the pixels the rasterizer has to touch.
      gl={{ alpha: true, antialias: false, preserveDrawingBuffer: false }}
      dpr={1}
      camera={{ position: [0, 0, 2.6], fov: 32 }}
      style={{ pointerEvents: "none" }}
    >
      <Fit paired={paired} />
      <ambientLight intensity={0.55} />
      {/* the key light stays put while the piece turns under it, matching the
          lighting the flat faces faked with a brightness filter. No castShadow
          here — a real-time shadow map is a second full render pass on top of
          ContactShadows' own blurred one below, and paying for both doubled
          the same bottleneck. */}
      <directionalLight position={[2.5, 3, 2]} intensity={2.1} />
      <directionalLight position={[-3, 1, -2]} intensity={0.7} color="#b9c7ff" />
      {/* A preset environment would fetch an HDR off a CDN on every open. The
          reflections are built here instead: a softbox above, two rims, all
          rendered in-scene, so the page stays self-contained. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3.2} position={[0, 3, 1]} scale={[6, 3, 1]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.3} color="#ffd9a8" position={[3.5, 0.5, 2]} scale={[3, 3, 1]} rotation={[0, -Math.PI / 4, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#9fb4ff" position={[-3.5, 0.5, -2]} scale={[3, 3, 1]} rotation={[0, Math.PI / 3, 0]} />
      </Environment>
      <Suspense fallback={null}>
        <Piece
          url={url}
          angleRef={angleRef}
          zoomRef={zoomRef}
          bobRef={bobRef}
          offsetX={paired ? -0.62 : 0}
          scaleFactor={paired ? 0.85 : 1}
          onReady={onReady}
        />
        {accessoryUrl && (
          <Piece
            url={accessoryUrl}
            angleRef={angleRef}
            zoomRef={zoomRef}
            bobRef={bobRef}
            offsetX={0.62}
            scaleFactor={0.85}
          />
        )}
      </Suspense>
      {/* frames=1: baked once on mount rather than re-rendered every frame —
          the piece only turns in place, so the blob underneath it barely
          changes shape, and this was the other half of the per-frame cost. */}
      <ContactShadows position={[0, -0.62, 0]} opacity={0.5} scale={3} blur={2.6} far={1.4} frames={1} />
    </Canvas>
  );
}

/** Pull the camera back on a narrow canvas so a phone doesn't crop the piece —
 * and further still when a companion accessory shares the frame. */
function Fit({ paired }: { paired: boolean }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const aspect = size.width / size.height || 1;
    const distance = (paired ? 3.6 : 2.6) / Math.min(1, Math.max(0.6, aspect / 0.92));
    camera.position.set(0, 0, distance);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, paired]);
  return null;
}
