/** Warm dark-wood display wall behind the products, plus side walls closing
 * the space in — kept deliberately simple/procedural (no textures) so the
 * scene stays light and fast. */
export default function Walls() {
  return (
    <>
      <mesh position={[0, 1.3, -3.3]} receiveShadow>
        <planeGeometry args={[24, 8]} />
        <meshStandardMaterial color="#2a1c12" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Wood-panel seams. */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} position={[-11 + i * 2.2, 1.3, -3.29]}>
          <planeGeometry args={[0.02, 8]} />
          <meshStandardMaterial color="#140d08" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-9, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.9} />
      </mesh>
      <mesh position={[9, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.9} />
      </mesh>
    </>
  );
}
