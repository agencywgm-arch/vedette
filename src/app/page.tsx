"use client";

import ScrollVideoHero from "@/components/hero/ScrollVideoHero";
import LoadingScreen from "@/components/ui/LoadingScreen";
import HUD from "@/components/ui/HUD";

export default function Home() {
  return (
    <main className="relative w-full bg-black">
      <ScrollVideoHero />
      <HUD />
      <LoadingScreen />
    </main>
  );
}
