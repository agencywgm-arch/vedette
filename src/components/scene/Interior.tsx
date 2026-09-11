"use client";

import { Text } from "@react-three/drei";
import Hotspot from "./Hotspot";
import { products } from "@/data/products";

const FLOOR = "#17171b";
const SHELF = "#1c1c22";
const ACCENT = "#f2c300";

function ClothingRow({
  x,
  z,
  count = 6,
  colors,
}: {
  x: number;
  z: number;
  count?: number;
  colors: string[];
}) {
  return (
    <group position={[x, 1.9, z]}>
      {/* hanging rail */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[count * 0.24 + 0.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[-((count - 1) * 0.24) / 2 + i * 0.24, -0.15, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.08]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ShelfUnit({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.6, 3.4, 0.5]} />
        <meshStandardMaterial color={SHELF} roughness={0.8} />
      </mesh>
      {[-1.1, -0.35, 0.4, 1.15].map((y, i) => (
        <mesh key={i} position={[0, y, 0.3]}>
          <boxGeometry args={[2.5, 0.04, 0.45]} />
          <meshStandardMaterial color="#0c0c0f" />
        </mesh>
      ))}
    </group>
  );
}

function Counter() {
  return (
    <group position={[3.4, 0, -10.5]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.1, 1]} />
        <meshStandardMaterial color="#111114" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[2.65, 0.05, 1.05]} />
        <meshStandardMaterial color="#1a1a1e" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* fridge behind counter */}
      <mesh position={[0, 1.4, -0.9]} castShadow>
        <boxGeometry args={[2.6, 2.6, 0.6]} />
        <meshPhysicalMaterial color="#0c1a2c" transparent opacity={0.45} roughness={0.1} transmission={0.5} />
      </mesh>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 2.4, -0.55]} fontSize={0.22} color={ACCENT} anchorX="center" anchorY="middle">
        vedette
      </Text>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 1.05, 0.52]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
        VISA · MASTERCARD · APPLE PAY
      </Text>
    </group>
  );
}

function FittingRoom() {
  return (
    <group position={[-3.8, 0, -10.8]}>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[1.6, 2.6, 1.6]} />
        <meshStandardMaterial color="#0d0d10" roughness={1} />
      </mesh>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 2.75, 0.81]} fontSize={0.22} color={ACCENT} anchorX="center" anchorY="middle">
        CABINE
      </Text>
    </group>
  );
}

function BackWallScreen() {
  return (
    <group position={[0.6, 2.4, -13.3]}>
      <mesh>
        <boxGeometry args={[3.4, 1.9, 0.08]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[3.2, 1.7]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      <Text font="/fonts/GeistMono-Bold.ttf" position={[0, 0, 0.06]} fontSize={0.5} color="#ffffff" anchorX="center" anchorY="middle">
        vedette
      </Text>
    </group>
  );
}

export default function Interior() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} receiveShadow>
        <planeGeometry args={[13, 18]} />
        <meshStandardMaterial color={FLOOR} roughness={0.95} />
      </mesh>
      {/* entry mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1.2]}>
        <planeGeometry args={[2, 1.2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
      <Text
        font="/fonts/GeistMono-Bold.ttf"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, -1.2]}
        fontSize={0.28}
        color={ACCENT}
        anchorX="center"
        anchorY="middle"
      >
        vedette
      </Text>

      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.2, -8]}>
        <planeGeometry args={[13, 18]} />
        <meshStandardMaterial color="#0b0b0d" roughness={1} />
      </mesh>

      {/* spotlights */}
      {[-3, 0, 3].map((x) =>
        [-4, -8, -12].map((z) => (
          <spotLight
            key={`${x}-${z}`}
            position={[x, 4, z]}
            angle={0.5}
            penumbra={0.6}
            intensity={12}
            distance={7}
            color="#ffe9b8"
          />
        ))
      )}

      <ShelfUnit position={[-4.3, 1.9, -4]} />
      <ShelfUnit position={[-4.3, 1.9, -7]} />
      <ClothingRow x={-1.4} z={-4.2} colors={["#111", "#f2c300", "#eee", "#111"]} />
      <ClothingRow x={-1.4} z={-6.6} colors={["#eee", "#111", "#c9302c", "#111"]} />
      <ClothingRow x={2.4} z={-3.6} count={5} colors={["#111", "#eee"]} />

      <FittingRoom />
      <Counter />
      <BackWallScreen />

      {products.map((p) => (
        <Hotspot key={p.id} product={p} />
      ))}
    </group>
  );
}
