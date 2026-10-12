"use client";

import { useEffect, useState } from "react";

/**
 * The opening instruction, drawn like a game's "press to continue" prompt:
 * a glowing frame, a mouse (or a thumb, on a phone) that actually does the
 * gesture, and chevrons pulling the eye down. It leaves as soon as the walk
 * has begun.
 */
export default function ScrollPrompt({ visible, touch }: { visible: boolean; touch: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 700);
    return () => window.clearTimeout(id);
  }, []);
  const show = visible && mounted;
  return (
    <div className={`scroll-prompt ${show ? "is-on" : ""}`} aria-hidden={!show}>
      <div className="scroll-prompt-frame">
        <span className="scroll-prompt-corner tl" />
        <span className="scroll-prompt-corner tr" />
        <span className="scroll-prompt-corner bl" />
        <span className="scroll-prompt-corner br" />
        <div className="scroll-prompt-icon">
          {touch ? (
            <svg viewBox="0 0 48 64" className="scroll-prompt-thumb">
              <path d="M20 6a4 4 0 018 0v22l5-2c3-1 5 1 5 4v14c0 8-6 14-14 14h-2c-5 0-8-3-11-8l-5-9c-1-2 0-4 2-4s3 1 4 3l2 3V6z" />
            </svg>
          ) : (
            <svg viewBox="0 0 40 64" className="scroll-prompt-mouse">
              <rect x="4" y="4" width="32" height="56" rx="16" />
              <rect className="scroll-prompt-wheel" x="17" y="14" width="6" height="12" rx="3" />
            </svg>
          )}
        </div>
        <div className="scroll-prompt-text">
          <p className="scroll-prompt-title">{touch ? "Glisse vers le haut" : "Scrolle vers le bas"}</p>
          <p className="scroll-prompt-sub">pour entrer dans la boutique</p>
        </div>
        <div className="scroll-prompt-chevrons">
          <i />
          <i />
          <i />
        </div>
      </div>
      <p className="scroll-prompt-skip">{touch ? "Double tap : mode rapide" : "Double clic : mode rapide"}</p>
    </div>
  );
}
