"use client";

import { useEffect, useState } from "react";
import type { WallPoster } from "@/data/collection";
import type { Rect } from "@/lib/media-rect";

const FLY_MS = 650;

function restRect(poster: WallPoster, box: { width: number; height: number }, compact: boolean): Rect {
  const maxH = box.height * (compact ? 0.6 : 0.68);
  const maxW = box.width * (compact ? 0.94 : 0.5);
  const ratio = poster.w / poster.h;
  let height = maxH;
  let width = height * ratio;
  if (width > maxW) {
    width = maxW;
    height = width / ratio;
  }
  return {
    left: box.width / 2 - width / 2,
    top: box.height * (compact ? 0.4 : 0.46) - height / 2,
    width,
    height,
  };
}

/**
 * A framed photo lifts off the wall from exactly where it hangs and settles
 * large in the middle of the room; closing sends it home the same way.
 */
export default function PosterLightbox({
  poster,
  origin,
  container,
  compact,
  onClose,
}: {
  poster: WallPoster;
  origin: Rect;
  container: { width: number; height: number };
  compact: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    window.setTimeout(onClose, FLY_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const r = open ? restRect(poster, container, compact) : origin;

  return (
    <>
      <div
        className="shop-backdrop shop-poster-backdrop"
        style={{ opacity: open ? 1 : 0 }}
        onClick={close}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster.src}
        alt={poster.name}
        draggable={false}
        className="shop-poster"
        onClick={close}
        style={{
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          transition: `left ${FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1), top ${FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1), width ${FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1), height ${FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      />
      <button
        type="button"
        className="shop-poster-close"
        onClick={close}
        aria-label="Fermer la photo"
        style={{ opacity: open ? 1 : 0 }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <p className="shop-poster-caption" style={{ opacity: open && !compact ? 1 : 0 }}>
        {poster.name}
      </p>
    </>
  );
}
