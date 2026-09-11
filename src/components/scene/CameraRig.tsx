"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { Color, Vector3 } from "three";
import { sampleFov, sampleKeyframes, smoothstep } from "@/lib/camera-path";
import { useSceneStore } from "@/store/useSceneStore";

const SKY = new Color("#a9d3ef");
const DUSK = new Color("#3a3a52");
const INTERIOR = new Color("#08080b");

const tmpPos = new Vector3();
const tmpLook = new Vector3();
const tmpColor = new Color();

export default function CameraRig() {
  const scroll = useScroll();
  const setScrollOffset = useSceneStore((s) => s.setScrollOffset);
  const setStage = useSceneStore((s) => s.setStage);
  const lastStage = useRef("street");
  const frameCount = useRef(0);

  useFrame((state, delta) => {
    const { camera, scene } = state;
    const offset = scroll.offset;

    sampleKeyframes(offset, "pos", tmpPos);
    sampleKeyframes(offset, "look", tmpLook);

    // subtle mouse parallax for immersion
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.15;
    tmpPos.x += px;
    tmpPos.y += py;

    camera.position.lerp(tmpPos, Math.min(1, delta * 6));
    const lookTarget = tmpLook.clone();
    lookTarget.x += px * 1.4;
    lookTarget.y += py * 1.4;
    camera.lookAt(lookTarget);

    if ("fov" in camera) {
      const fov = sampleFov(offset);
      camera.fov += (fov - camera.fov) * Math.min(1, delta * 4);
      camera.updateProjectionMatrix();
    }

    const night = smoothstep(0.45, 0.75, offset);
    tmpColor.copy(SKY).lerp(DUSK, smoothstep(0.25, 0.45, offset));
    tmpColor.lerp(INTERIOR, night);
    if (scene.background instanceof Color) {
      scene.background.copy(tmpColor);
    } else {
      scene.background = tmpColor.clone();
    }
    if (scene.fog && "color" in scene.fog) {
      (scene.fog.color as Color).copy(tmpColor);
    }

    frameCount.current++;
    if (frameCount.current % 3 === 0) {
      setScrollOffset(offset);
      const stage =
        offset < 0.35 ? "street" : offset < 0.53 ? "approach" : offset < 0.68 ? "threshold" : "interior";
      if (stage !== lastStage.current) {
        lastStage.current = stage;
        setStage(stage);
      }
    }
  });

  return null;
}
