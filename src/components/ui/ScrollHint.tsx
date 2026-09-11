"use client";

import { useSceneStore } from "@/store/useSceneStore";

export default function ScrollHint() {
  const started = useSceneStore((s) => s.started);
  const stage = useSceneStore((s) => s.stage);

  if (!started || stage !== "street") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex flex-col items-center gap-2 text-white/80">
      <div className="scroll-hint flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/60 p-1">
        <div className="h-2 w-1 rounded-full bg-white/80" />
      </div>
      <span className="text-[11px] uppercase tracking-[0.3em]">Scrollez pour entrer</span>
    </div>
  );
}
