export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#ffe3b0" />
      <hemisphereLight args={["#3a3a45", "#100a05", 0.4]} />
      {/* Warm indirect shelf lighting along the display wall. */}
      <pointLight position={[-4, 2.6, -1.5]} intensity={18} color="#ffb35c" distance={9} decay={2} />
      <pointLight position={[0, 2.6, -1.5]} intensity={18} color="#ffb35c" distance={9} decay={2} />
      <pointLight position={[4, 2.6, -1.5]} intensity={18} color="#ffb35c" distance={9} decay={2} />
      {/* Cool key light for the floating inspector product. */}
      <spotLight
        position={[1.5, 4, 3]}
        angle={0.5}
        penumbra={0.6}
        intensity={22}
        color="#fff4e0"
        distance={12}
      />
    </>
  );
}
