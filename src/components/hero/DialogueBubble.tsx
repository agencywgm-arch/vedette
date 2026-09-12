"use client";

import { GUARD_ANCHOR } from "@/lib/video-timeline";
import { overlayPosition, type ContainRect } from "@/lib/overlay-position";
import type { EntryMode } from "@/store/useSceneStore";

export default function DialogueBubble({
  visible,
  isMobile,
  containRect,
  onChoose,
}: {
  visible: boolean;
  isMobile: boolean;
  containRect: ContainRect | null;
  onChoose: (mode: EntryMode) => void;
}) {
  const x = isMobile ? GUARD_ANCHOR.mobileX : GUARD_ANCHOR.x;
  const y = isMobile ? GUARD_ANCHOR.mobileY : GUARD_ANCHOR.y;
  const pos = overlayPosition(x, y, isMobile, containRect);

  return (
    <div
      className="absolute z-30"
      style={{
        ...pos,
        transform: "translate(-30%, calc(-100% - 14px))",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      <div className={`comic-bubble ${visible ? "comic-bubble-in" : ""}`}>
        <p className="comic-bubble-text">Mode rapide ou mode expérience ?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChoose("fast")}
            className="comic-bubble-btn"
          >
            Rapide
            <span>direct dans la boutique</span>
          </button>
          <button
            type="button"
            onClick={() => onChoose("experience")}
            className="comic-bubble-btn comic-bubble-btn-accent"
          >
            Expérience
            <span>profite du trajet</span>
          </button>
        </div>
        <div className="comic-bubble-tail" />
      </div>
    </div>
  );
}
