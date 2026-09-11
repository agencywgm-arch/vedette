"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "@/components/ui/LoadingScreen";
import HUD from "@/components/ui/HUD";
import ScrollHint from "@/components/ui/ScrollHint";
import ProductModal from "@/components/ui/ProductModal";

const CanvasRoot = dynamic(() => import("@/components/scene/CanvasRoot"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#08080b]">
      <CanvasRoot />
      <HUD />
      <ScrollHint />
      <ProductModal />
      <LoadingScreen />
    </main>
  );
}
