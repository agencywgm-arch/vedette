"use client";

import { Text } from "@react-three/drei";
import Doors from "./Doors";

const NAVY = "#0f2049";
const NAVY_DARK = "#0a1732";
const YELLOW = "#f2c300";

function Sidewalk() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#c9c2b4" roughness={1} />
      </mesh>
      {/* street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 22]} receiveShadow>
        <planeGeometry args={[40, 8]} />
        <meshStandardMaterial color="#2a2a2e" roughness={1} />
      </mesh>
    </group>
  );
}

function Bollard({ x }: { x: number }) {
  return (
    <mesh position={[x, 0.5, 12.5]} castShadow>
      <cylinderGeometry args={[0.08, 0.08, 1, 12]} />
      <meshStandardMaterial color="#111" roughness={0.6} />
    </mesh>
  );
}

function StreetLamp() {
  return (
    <group position={[-6.5, 0, 13]}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 5, 10]} />
        <meshStandardMaterial color="#151515" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 5, 0.3]}>
        <boxGeometry args={[0.18, 0.4, 0.18]} />
        <meshStandardMaterial color="#151515" />
      </mesh>
      <pointLight position={[0, 5, 0.3]} intensity={4} distance={8} color="#ffd98a" />
    </group>
  );
}

function DigitalSign() {
  return (
    <group position={[0, 5.3, 1.9]}>
      <mesh>
        <boxGeometry args={[2.4, 1.1, 0.1]} />
        <meshStandardMaterial color="#b3121b" emissive="#5c0006" emissiveIntensity={0.6} />
      </mesh>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 0.28, 0.06]} fontSize={0.24} color="#ffffff" anchorX="center" anchorY="middle">
        VEDETTE
      </Text>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, -0.05, 0.06]} fontSize={0.22} color="#7cff6b" anchorX="center" anchorY="middle">
        24/7 OUVERT
      </Text>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, -0.35, 0.06]} fontSize={0.16} color="#ffe066" anchorX="center" anchorY="middle">
        {"*****"}
      </Text>
    </group>
  );
}

export default function Storefront() {
  return (
    <group>
      <Sidewalk />
      <StreetLamp />
      <Bollard x={-2.2} />
      <Bollard x={2.2} />

      {/* facade */}
      <mesh position={[0, 3.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[13, 7, 1.6]} />
        <meshStandardMaterial color={NAVY} roughness={0.75} />
      </mesh>
      {/* dark base band */}
      <mesh position={[0, 0.55, 0.82]}>
        <boxGeometry args={[13.02, 1.1, 0.05]} />
        <meshStandardMaterial color={NAVY_DARK} roughness={0.9} />
      </mesh>

      {/* corner brick accents */}
      <mesh position={[-6.6, 6, -1]}>
        <boxGeometry args={[2, 5, 3]} />
        <meshStandardMaterial color="#7a4a36" roughness={1} />
      </mesh>
      <mesh position={[6.6, 6, -1]}>
        <boxGeometry args={[2, 5, 3]} />
        <meshStandardMaterial color="#7a4a36" roughness={1} />
      </mesh>

      {/* awning */}
      <group position={[0, 3.85, 1.3]}>
        <mesh rotation={[0.28, 0, 0]}>
          <boxGeometry args={[13, 1.5, 0.08]} />
          <meshStandardMaterial color={YELLOW} roughness={0.6} />
        </mesh>
        <Text font="/fonts/GeistMono-Bold.ttf" position={[-3.2, 0.15, 0.3]} rotation={[0.28, 0, 0]} fontSize={0.55} color="#0a0a0a" anchorX="center" anchorY="middle">
          VÊTEMENT
        </Text>
        <Text font="/fonts/GeistMono-Bold.ttf" position={[4.6, 0.15, 0.3]} rotation={[0.28, 0, 0]} fontSize={0.42} color="#0a0a0a" anchorX="center" anchorY="middle">
          24/7
        </Text>
      </group>

      {/* sub-awning band */}
      <group position={[0, 2.75, 1.35]}>
        <mesh>
          <boxGeometry args={[13, 0.55, 0.06]} />
          <meshStandardMaterial color={YELLOW} roughness={0.6} />
        </mesh>
        <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 0, 0.05]} fontSize={0.28} color="#0a0a0a" anchorX="center" anchorY="middle" letterSpacing={0.05}>
          SNOB · VILLAIN · ARROGANT
        </Text>
      </group>

      <DigitalSign />

      {/* door frame opening */}
      <mesh position={[0, 1.3, 1.6]}>
        <boxGeometry args={[2.2, 2.7, 0.4]} />
        <meshStandardMaterial color={NAVY_DARK} />
      </mesh>
      <Doors />

      {/* sign above door */}
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 2.35, 1.85]} fontSize={0.22} color={YELLOW} anchorX="center" anchorY="middle">
        vedette
      </Text>

      {/* side window with logo */}
      <group position={[-4.3, 1.6, 1.62]}>
        <mesh>
          <boxGeometry args={[2.6, 2.2, 0.06]} />
          <meshPhysicalMaterial color="#0a1830" transparent opacity={0.55} roughness={0.15} transmission={0.3} />
        </mesh>
        <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 0, 0.05]} fontSize={0.32} color={YELLOW} anchorX="center" anchorY="middle">
          vedette
        </Text>
      </group>
      <group position={[4.3, 1.6, 1.62]}>
        <mesh>
          <boxGeometry args={[2.6, 2.2, 0.06]} />
          <meshPhysicalMaterial color="#0a1830" transparent opacity={0.55} roughness={0.15} transmission={0.3} />
        </mesh>
        <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 0, 0.05]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="middle">
          VEDETTE PARIS
        </Text>
      </group>
    </group>
  );
}
