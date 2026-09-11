"use client";

import ScrollVideoHero from "@/components/hero/ScrollVideoHero";
import LoadingScreen from "@/components/ui/LoadingScreen";
import HUD from "@/components/ui/HUD";
import ScrollHint from "@/components/ui/ScrollHint";
import ProductModal from "@/components/ui/ProductModal";

export default function Home() {
  return (
    <main className="relative w-full bg-black">
      <ScrollVideoHero />
      <HUD />
      <ScrollHint />
      <ProductModal />
      <LoadingScreen />
    </main>
  );
}
