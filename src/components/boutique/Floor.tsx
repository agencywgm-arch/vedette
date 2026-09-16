export default function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} receiveShadow>
      <planeGeometry args={[30, 14]} />
      <meshStandardMaterial color="#1b1712" roughness={0.35} metalness={0.35} />
    </mesh>
  );
}
