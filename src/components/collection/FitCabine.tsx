"use client";

import { useState } from "react";
import type { CollectionItem } from "@/data/collection";
import {
  BODIES,
  FIT_ASSETS,
  MORPHS,
  MORPH_LABELS,
  chestWidth,
  easeLabel,
  fitKind,
  type FitSide,
  type Morph,
} from "@/data/fit";

const CX = 60;

/**
 * The cabine, without any generated imagery: a neutral mannequin drawn to
 * scale (cm) with the piece's own transparent photo laid over it, sized from
 * the garment's chest width. Switching size or body type moves real numbers,
 * so what you see is how that cut falls on that body — and the garment is
 * always the real photograph, never a redraw.
 */
export default function FitCabine({ item }: { item: CollectionItem }) {
  const kind = fitKind(item.category);
  const assets = FIT_ASSETS[item.id];
  const [morph, setMorph] = useState<Morph>("medium");
  const [size, setSize] = useState(item.sizes[1] ?? item.sizes[0] ?? "M");
  const [side, setSide] = useState<FitSide>("front");

  if (!kind || !assets) return null;
  const face = assets[side] ?? assets.front;
  if (!face) return null;
  const shownSide: FitSide = assets[side] ? side : "front";

  const body = BODIES[morph];
  const chestFlat = body.chest / 2.67;
  const waist = chestFlat * 0.94;
  const hips = chestFlat * 1.02;
  const sh = body.shoulders;
  const armW = morph === "mince" ? 8 : morph === "large" ? 11.5 : 9.5;
  const armX = sh / 2 + 1.5;

  const garmentChest = kind === "top" ? chestWidth(item.id, item.category, size) : null;
  let img: { x: number; y: number; w: number; h: number } | null = null;
  if (kind === "top" && garmentChest) {
    const w = garmentChest / face.chest;
    const h = (w * face.h) / face.w;
    img = { x: CX - w / 2, y: 31, w, h };
  } else if (kind === "cap") {
    const w = 25;
    const h = (w * face.h) / face.w;
    img = { x: CX - w / 2, y: 18 - h, w, h };
  } else if (kind === "bag") {
    const w = 26;
    const h = (w * face.h) / face.w;
    img = { x: CX + armX + 3 - w / 2, y: 91, w, h };
  }

  const bodyFill = "#8b909c";
  const legTop = 102;
  const lw = hips / 2 - 0.8;
  const flare = 3.5;

  return (
    <div className="fit-cabine" onClick={(e) => e.stopPropagation()}>
      <svg
        className="fit-cabine-svg"
        viewBox="0 -4 120 204"
        role="img"
        aria-label={`${item.name} porté, taille ${size}`}
      >
        {/* legs + shoes: baggy black jeans, same on every body */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <polygon
              fill="#1c1e23"
              points={`${CX + s * 0.8},${legTop} ${CX + s * (lw + 0.8)},${legTop} ${
                CX + s * (lw + 0.8 + flare)
              },188 ${CX + s * (0.8 - 0.5)},188`}
            />
            <ellipse cx={CX + s * (lw / 2 + 2.5)} cy={191.5} rx={8.5} ry={4} fill="#0b0b0d" />
          </g>
        ))}
        {/* arms */}
        {[-1, 1].map((s) => (
          <line
            key={s}
            x1={CX + s * (armX - 1.5)}
            y1={38}
            x2={CX + s * (armX + 3)}
            y2={95}
            stroke={bodyFill}
            strokeWidth={armW}
            strokeLinecap="round"
          />
        ))}
        {/* torso */}
        <path
          fill={kind === "top" ? bodyFill : "#16181d"}
          d={`M ${CX - sh / 2 + 3},33 Q ${CX - sh / 2},34 ${CX - sh / 2},39
              L ${CX - chestFlat / 2},62 L ${CX - waist / 2},86 L ${CX - hips / 2},${legTop + 2}
              L ${CX + hips / 2},${legTop + 2} L ${CX + waist / 2},86 L ${CX + chestFlat / 2},62
              L ${CX + sh / 2},39 Q ${CX + sh / 2},34 ${CX + sh / 2 - 3},33 Z`}
        />
        {/* neck + head in a black balaclava */}
        <rect x={CX - 4.5} y={24} width={9} height={11} fill="#0b0b0d" />
        <ellipse cx={CX} cy={15.5} rx={9.5} ry={11.5} fill="#0b0b0d" />
        {shownSide === "front" && (
          <rect x={CX - 5.6} y={13.2} width={11.2} height={2.6} rx={1.3} fill="#9a9aa4" />
        )}

        {img && (
          <image
            href={`/fit/${item.id}-${shownSide}.webp`}
            x={img.x}
            y={img.y}
            width={img.w}
            height={img.h}
            preserveAspectRatio="none"
          />
        )}
      </svg>

      <div className="fit-cabine-panel">
        <p className="fit-cabine-title">{item.name}</p>
        {kind === "top" && garmentChest ? (
          <p className="fit-cabine-ease">
            {easeLabel(garmentChest, body.chest)}
            <span>
              {" "}
              · pièce {garmentChest} cm de large · corps {body.chest} cm de poitrine
            </span>
          </p>
        ) : null}

        {kind === "top" && (
          <>
            <div className="fit-cabine-row" role="group" aria-label="Morphologie">
              {MORPHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={morph === m}
                  className={morph === m ? "is-active" : undefined}
                  onClick={() => setMorph(m)}
                >
                  {MORPH_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="fit-cabine-row" role="group" aria-label="Taille">
              {item.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  className={size === s ? "is-active" : undefined}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {assets.back && assets.front && (
          <div className="fit-cabine-row" role="group" aria-label="Vue">
            {(["front", "back"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={shownSide === v}
                className={shownSide === v ? "is-active" : undefined}
                onClick={() => setSide(v)}
              >
                {v === "front" ? "Face" : "Dos"}
              </button>
            ))}
          </div>
        )}
        <p className="fit-cabine-note">
          Photo réelle de la pièce, à l&apos;échelle · mesures indicatives
        </p>
      </div>
    </div>
  );
}
