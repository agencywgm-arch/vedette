"use client";

import { useState } from "react";
import CabineViewer from "./CabineViewer";

/** Bump when the carry photos change: busts copies cached by phones. */
const CARRY_VERSION = "20261017b";

export interface CarryStyle {
  id: string;
  label: string;
}

/**
 * A bag worn every way it can be: one real photo per way of carrying it,
 * picked from a row of chips, plus the usual 360° turn of the mannequin.
 */
export default function CabineCarry({
  base,
  folder,
  styles,
  label,
}: {
  /** Folder of the 8-shot turn (the 360° view). */
  base: string;
  /** Folder holding one <id>.webp per carry style. */
  folder: string;
  styles: CarryStyle[];
  label: string;
}) {
  // null = the 360° turn
  const [current, setCurrent] = useState<string | null>(styles[0]?.id ?? null);
  const style = styles.find((s) => s.id === current);

  return (
    <>
      {style ? (
        <div className="shop-cabine-stage shop-cabine-carry" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={style.id}
            src={`${folder}/${style.id}.webp?v=${CARRY_VERSION}`}
            alt={`${label} — ${style.label}`}
            className="shop-cabine-img"
            draggable={false}
          />
        </div>
      ) : (
        <CabineViewer base={base} label={label} />
      )}
      <div
        className="shop-cabine-morphs shop-cabine-carry-chips"
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label="Façon de porter le sac"
      >
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={current === s.id}
            className={current === s.id ? "is-active" : undefined}
            onClick={() => setCurrent(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={current === null}
          className={current === null ? "is-active" : undefined}
          onClick={() => setCurrent(null)}
        >
          360°
        </button>
      </div>
    </>
  );
}
