"use client";

import Image from "next/image";

/** Brief branded loading bumper shown at the hard cut between the entrance
 * and collection clips, masking the pop between their mismatched frames. */
export default function PhaseTransition({ visible }: { visible: boolean }) {
  return (
    <div
      className="phase-transition-overlay pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-[#08080b]"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? "opacity 0.15s ease" : "opacity 0.4s ease",
      }}
    >
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        className="h-auto w-40 sm:w-52"
      />
      <div className="flex gap-1.5">
        <span className="phase-loading-dot" style={{ animationDelay: "0ms" }} />
        <span className="phase-loading-dot" style={{ animationDelay: "0.15s" }} />
        <span className="phase-loading-dot" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}
