"use client";

import Image from "next/image";
import { useSceneStore } from "@/store/useSceneStore";

const STAGE_LABEL: Record<string, string> = {
  street: "Rue",
  approach: "Approche",
  threshold: "Entrée",
};

export default function HUD() {
  const started = useSceneStore((s) => s.started);
  const scrollOffset = useSceneStore((s) => s.scrollOffset);
  const stage = useSceneStore((s) => s.stage);

  // The boutique has its own header/HUD once entered — this scroll-progress
  // overlay only makes sense during the entrance walk-in.
  if (!started || stage === "boutique") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <Image
          src="/logo-white.png"
          alt="vedette"
          width={1913}
          height={342}
          className="h-5 w-auto drop-shadow sm:h-6"
        />
        <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-widest text-white/80 backdrop-blur">
          {STAGE_LABEL[stage] ?? "Rue"}
        </span>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[#f2c300] transition-[width] duration-150"
            style={{ width: `${Math.round(scrollOffset * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
