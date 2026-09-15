"use client";

import Image from "next/image";
import { useSceneStore } from "@/store/useSceneStore";

export default function LoadingScreen() {
  const started = useSceneStore((s) => s.started);
  const setStarted = useSceneStore((s) => s.setStarted);

  // Unlock video scrubbing (iOS/Safari requires currentTime writes to
  // follow a real user-gesture play()) right inside this click handler —
  // a later effect runs outside the gesture's call stack and Safari may
  // refuse to honor it, leaving the video stuck on its poster frame.
  const handleStart = () => {
    document.querySelectorAll("video").forEach((video) => {
      const primed = video.play();
      if (primed && typeof primed.then === "function") {
        primed.then(() => video.pause()).catch(() => {});
      }
    });
    setStarted(true);
  };

  if (started) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08080b] text-white px-6">
      <div className="flex flex-col items-center gap-4 fade-in">
        <Image
          src="/logo-white.png"
          alt="vedette"
          width={1913}
          height={342}
          priority
          className="h-auto w-64 sm:w-80"
        />
        <span className="text-xs sm:text-sm tracking-[0.35em] text-[#f2c300] uppercase">
          Snob · Villain · Arrogant
        </span>
        <button
          onClick={handleStart}
          className="mt-8 rounded-full bg-[#f2c300] px-8 py-3 text-sm font-bold uppercase tracking-wide text-black transition-transform hover:scale-105 active:scale-95"
        >
          Entrer dans la boutique
        </button>
        <span className="mt-3 text-[11px] text-white/40 uppercase tracking-wide">
          Ouvert 24/7 — Paris
        </span>
      </div>
    </div>
  );
}
