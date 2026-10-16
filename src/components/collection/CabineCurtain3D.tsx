"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The fitting-room curtain, as real cloth: two panels of black velvet with
 * pleats that tighten as they are drawn to the sides, lit from above, with
 * the Vedette wordmark embroidered across the seam. The logo lives in the
 * fabric's own coordinates, so it bunches up into the folds with the cloth.
 *
 * Timeline mirrors the CSS curtain it replaces: closed for a beat, then drawn
 * aside over ~2.4 s.
 */

const DELAY = 0.5;
const DURATION = 1.3;
const S_END = 0.075; // how narrow a panel gets once it is fully gathered

const VERT = /* glsl */ `
  uniform float uSide;      // -1 left panel, +1 right panel
  uniform float uW;         // width of one panel (px)
  uniform float uH;         // height of the screen (px)
  uniform float uOpen;      // 0 closed → 1 open
  uniform float uTime;
  varying vec2 vMat;        // fabric coordinates (px from the seam, px from centre line)
  varying float vFold;
  varying vec3 vN;
  varying float vNy;

  float ease(float x) { return x * x * (3.0 - 2.0 * x); }

  void main() {
    float mx = position.x + uSide * uW * 0.5;     // px from the seam, in fabric space
    float d = clamp(abs(mx) / uW, 0.0, 1.0);      // 0 at the seam, 1 at the outer edge
    // inner points start moving first, the outer ones follow
    float e = ease(clamp(uOpen * 1.35 - 0.35 * d, 0.0, 1.0));
    float s = 1.0 - (1.0 - ${S_END.toFixed(3)}) * e;
    float D = uW * (1.0 - (1.0 - d) * s);
    float x = uSide * D;

    float pl = uW / 5.0;                          // pleat period in the fabric
    float ph = mx / pl * 6.2831853;
    float f = sin(ph) + 0.35 * sin(2.31 * ph + 1.7) + 0.15 * sin(4.7 * ph + 0.4);
    float df = cos(ph) + 0.35 * 2.31 * cos(2.31 * ph + 1.7) + 0.15 * 4.7 * cos(4.7 * ph + 0.4);
    float ny = position.y / uH + 0.5;             // 0 hem … 1 rod
    float gather = pow(1.0 - s, 0.85);
    float A = (uW * 0.034 + uW * 0.11 * gather) * (0.72 + 0.28 * (1.0 - ny));
    float sway = sin(position.y * 0.012 + uTime * 1.6 + d * 5.0) * uW * 0.006 * sin(uOpen * 3.14159) * 4.0;
    float z = A * f + sway;

    // slope of the cloth along the screen x axis → shading normal
    float dzdx = A * df * (6.2831853 / pl) / max(s, 0.06);
    vN = normalize(vec3(-dzdx * 0.7, -0.02, 1.0));
    vFold = f;
    vNy = ny;
    vMat = vec2(mx, position.y);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, position.y, z, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uLogo;
  uniform float uLogoW;
  uniform float uLogoH;
  uniform float uSide;
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vMat;
  varying float vFold;
  varying vec3 vN;
  varying float vNy;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float logoA(vec2 m, vec2 off) {
    vec2 uv = vec2((m.x + off.x) / uLogoW + 0.5, (m.y + off.y) / uLogoH + 0.5);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture2D(uLogo, uv).a;
  }

  void main() {
    vec3 n = normalize(vN);
    vec3 L = normalize(vec3(-0.28, 0.5, 0.82));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);

    // velvet: dark body, light caught on the slopes
    vec3 base = vec3(0.050, 0.046, 0.066);
    float valley = smoothstep(-1.4, 1.0, vFold);
    float ao = 0.45 + 0.55 * valley;
    vec3 col = base * (0.30 + 2.6 * diff) * ao;
    col += vec3(0.34, 0.32, 0.46) * rim * (0.2 + 1.1 * diff) * 0.7;
    col += vec3(0.16, 0.15, 0.19) * pow(diff, 4.0) * 0.9;

    // fine pile + weave
    float g = hash(floor(gl_FragCoord.xy * 0.75));
    col *= 0.92 + 0.16 * g;
    col += 0.012 * sin(vMat.x * 1.7) * sin(vMat.y * 1.3);

    // gathered under the rod, heavy at the hem, tucked at the seam
    col *= mix(0.35, 1.0, smoothstep(0.88, 0.62, vNy));
    col *= mix(1.0, 0.55, smoothstep(0.1, 0.0, vNy));
    col *= mix(0.62, 1.0, smoothstep(0.0, 40.0, abs(vMat.x)));

    // embroidered wordmark: raised thread with a soft shadow under it
    float a = logoA(vMat, vec2(0.0)) * (1.0 - smoothstep(0.5, 0.95, uOpen));
    float sh = logoA(vMat, vec2(-3.0, 4.0)) * (1.0 - smoothstep(0.5, 0.95, uOpen));
    col *= 1.0 - 0.55 * sh * (1.0 - a);
    float thread = 0.93 + 0.07 * sin(vMat.y * 2.2 + vMat.x * 0.4);
    vec3 emb = vec3(0.93, 0.92, 0.90) * (0.55 + 0.6 * diff + 0.25 * rim) * thread;
    col = mix(col, emb, a);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Panels({ onReady }: { onReady: () => void }) {
  const size = useThree((s) => s.size);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const t0 = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    new THREE.TextureLoader().load("/logo-white.png", (t) => {
      if (!live) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      setTex(t);
      onReady();
    });
    return () => {
      live = false;
    };
  }, [onReady]);

  const W = size.width / 2 + 1;
  const H = size.height;
  const logoW = Math.min(size.width * 0.78, 680);
  const logoH = logoW * (342 / 1913);

  const mats = useMemo(() => {
    if (!tex) return null;
    const make = (side: number) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uSide: { value: side },
          uW: { value: W },
          uH: { value: H },
          uOpen: { value: 0 },
          uTime: { value: 0 },
          uLogo: { value: tex },
          uLogoW: { value: logoW },
          uLogoH: { value: logoH },
        },
      });
    return [make(-1), make(1)] as const;
  }, [tex, W, H, logoW, logoH]);

  const geo = useMemo(() => new THREE.PlaneGeometry(W, H, 120, 48), [W, H]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mats?.forEach((m) => m.dispose());
    };
  }, [geo, mats]);

  useFrame((state) => {
    if (!mats) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    const open = Math.min(1, Math.max(0, (t - DELAY) / DURATION));
    for (const m of mats) {
      m.uniforms.uOpen.value = open;
      m.uniforms.uTime.value = t;
    }
  });

  if (!mats) return null;
  return (
    <>
      <mesh geometry={geo} material={mats[0]} position={[0, 0, 0]} frustumCulled={false} />
      <mesh geometry={geo} material={mats[1]} position={[0, 0, 0]} frustumCulled={false} />
    </>
  );
}

export default function CabineCurtain3D({ onReady }: { onReady?: () => void }) {
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);
  const [cb] = useState(() => () => ready.current?.());
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 600], zoom: 1, near: 1, far: 2000 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Panels onReady={cb} />
    </Canvas>
  );
}
