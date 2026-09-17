"use client";

import { GUARD_ANCHOR } from "@/lib/video-timeline";
import { overlayPosition, type ContainRect } from "@/lib/overlay-position";

// The bubble box sits above and right of its anchor point (see the
// transform below). On a wide, short viewport — a phone in landscape —
// object-cover crops so much off the top and bottom that a point anchored
// near the guard's own head can land close enough to the container's top
// edge to push the box itself off-screen. Keep the anchor at least this
// many px down so the box always has room to sit fully in view.
const MIN_ANCHOR_TOP_PX = 150;

export default function DialogueBubble({
  visible,
  isMobile,
  containRect,
  onChoose,
}: {
  visible: boolean;
  isMobile: boolean;
  containRect: ContainRect | null;
  onChoose: () => void;
}) {
  // Mobile: a small, reliably-visible bubble centered in the frame — no
  // per-device head-anchoring math, which kept landing too big or misplaced
  // on real phones. Desktop keeps the tail pointing at the guard.
  const anchorPosition = overlayPosition(GUARD_ANCHOR.x, GUARD_ANCHOR.y, containRect);
  const wrapperStyle = isMobile
    ? {
        left: "50%",
        top: "48%",
        transform: "translate(-50%, -50%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? ("auto" as const) : ("none" as const),
        transition: "opacity 0.3s ease",
      }
    : {
        ...anchorPosition,
        top:
          typeof anchorPosition.top === "number"
            ? Math.max(anchorPosition.top, MIN_ANCHOR_TOP_PX)
            : anchorPosition.top,
        transform: "translate(-30%, calc(-100% - 14px))",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? ("auto" as const) : ("none" as const),
        transition: "opacity 0.3s ease",
      };

  return (
    <div className="absolute z-30" style={wrapperStyle}>
      <div
        className={`comic-bubble ${isMobile ? "comic-bubble-mobile" : ""} ${
          visible ? "comic-bubble-in" : ""
        }`}
      >
        <p className="comic-bubble-text">Prêt à découvrir la collection ?</p>
        <button
          type="button"
          onClick={onChoose}
          className="comic-bubble-btn comic-bubble-btn-accent block w-full"
        >
          Mode rapide
          <span>voir la collection</span>
        </button>
        {!isMobile && <div className="comic-bubble-tail" />}
      </div>
    </div>
  );
}
