"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { ROOM_LEAVE_AT } from "@/lib/video-timeline";

const STAGE_LABEL: Record<string, string> = {
  street: "Rue",
  approach: "Approche",
  threshold: "Entrée",
  collection: "Collection",
};

export default function HUD() {
  const started = useSceneStore((s) => s.started);
  const stage = useSceneStore((s) => s.stage);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // The bar tracks scroll frame by frame. Selecting scrollOffset out of the
  // store would re-render this whole overlay sixty times a second just to
  // move it — and restart its width transition on every one of those frames,
  // which is what made it stutter rather than glide. Read the store directly
  // and write the two styles by hand instead; the value itself is the
  // animation, so it needs no transition at all.
  useEffect(() => {
    const apply = (offset: number) => {
      const bar = barRef.current;
      if (bar) bar.style.width = `${Math.min(100, offset * 100)}%`;
      const root = rootRef.current;
      if (!root) return;
      // The collection room brings its own header — this walk-in HUD steps
      // aside for it, but stays mounted so it can come back on the way out.
      const gone = offset >= ROOM_LEAVE_AT;
      root.style.opacity = gone ? "0" : "1";
      root.style.visibility = gone ? "hidden" : "visible";
    };
    apply(useSceneStore.getState().scrollOffset);
    return useSceneStore.subscribe((s) => apply(s.scrollOffset));
  }, [started]);

  if (!started) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 transition-opacity duration-300 sm:p-6"
    >
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
          <div ref={barRef} className="h-full rounded-full bg-[#f2c300]" />
        </div>
      </div>
    </div>
  );
}
