import type { Category } from "./collection";

export type Morph = "mince" | "medium" | "large";
export type FitSide = "front" | "back";

/** A trimmed, transparent cut-out of the real product photo, at public/fit/. */
export interface FitFace {
  /** Pixel size of the trimmed cut-out. */
  w: number;
  h: number;
  /** Width of the garment's body (below the sleeves) as a share of the
   *  cut-out's full width — lets us scale by real chest width, not by the
   *  sleeves. Measured from the photo. */
  chest: number;
}

export const FIT_ASSETS: Record<string, Partial<Record<FitSide, FitFace>>> = {
  "jparis-tee": { front: { w: 590, h: 574, chest: 0.627 }, back: { w: 590, h: 574, chest: 0.625 } },
  "champions-tee": { front: { w: 582, h: 569, chest: 0.629 }, back: { w: 583, h: 568, chest: 0.626 } },
  "paris-polo": { front: { w: 913, h: 994, chest: 0.91 }, back: { w: 927, h: 935, chest: 0.898 } },
  "vedette-vneck": { front: { w: 1137, h: 1000, chest: 0.891 }, back: { w: 1211, h: 1050, chest: 0.927 } },
  "boxe-khoya-tank": { front: { w: 511, h: 1000, chest: 0.896 } },
  "forreal-tee": { front: { w: 920, h: 770, chest: 0.601 } },
  "rainbow-jersey": { front: { w: 401, h: 563, chest: 0.99 }, back: { w: 405, h: 562, chest: 0.998 } },
  "jparis-sweat": { front: { w: 786, h: 584, chest: 0.962 } },
  "black-jacket": { front: { w: 724, h: 830, chest: 0.95 }, back: { w: 755, h: 852, chest: 0.992 } },
  "cap-vedette": { front: { w: 685, h: 520, chest: 0.822 } },
  "cap-bienoufoie": { front: { w: 1367, h: 1000, chest: 0.892 } },
  "cap-camo": { front: { w: 620, h: 607, chest: 0.934 } },
  "cap-heart": { front: { w: 674, h: 544, chest: 0.807 } },
  "sac-vedette": { front: { w: 471, h: 527, chest: 0.936 } },
};

export const MORPHS: Morph[] = ["mince", "medium", "large"];
export const MORPH_LABELS: Record<Morph, string> = {
  mince: "Mince",
  medium: "Médium",
  large: "Large",
};

/** Mannequin body, in cm. Chest is the circumference; shoulders the width. */
export const BODIES: Record<Morph, { chest: number; shoulders: number; legs: number }> = {
  mince: { chest: 90, shoulders: 42, legs: 10 },
  medium: { chest: 98, shoulders: 45, legs: 11.5 },
  large: { chest: 108, shoulders: 49, legs: 13 },
};

/**
 * Flat chest width of the garment (cm, seam to seam) per size. These are
 * working estimates per category, NOT the brand's measured size chart: swap
 * in the real measurements per piece through `FIT_CHEST_OVERRIDES`.
 */
const CHEST_BY_CATEGORY: Partial<Record<Category, Record<string, number>>> = {
  "T-SHIRTS": { S: 55, M: 58, L: 61, XL: 64 },
  SWEATS: { S: 56, M: 59, L: 62, XL: 65 },
  VESTES: { S: 55, M: 58, L: 61, XL: 64 },
  MAILLOTS: { S: 49, M: 52, L: 55, XL: 58 },
};

/** Real measured chest widths per piece, when known: { id: { S: cm, ... } }. */
export const FIT_CHEST_OVERRIDES: Record<string, Record<string, number>> = {};

export function chestWidth(id: string, category: Category, size: string): number | null {
  return FIT_CHEST_OVERRIDES[id]?.[size] ?? CHEST_BY_CATEGORY[category]?.[size] ?? null;
}

export type FitKind = "top" | "cap" | "bag";
export function fitKind(category: Category): FitKind | null {
  if (category === "CASQUETTES") return "cap";
  if (category === "ACCESSOIRES") return "bag";
  if (CHEST_BY_CATEGORY[category]) return "top";
  return null;
}

/** How the piece sits: garment circumference minus body circumference. */
export function easeLabel(garmentChest: number, bodyChest: number): string {
  const ease = garmentChest * 2 - bodyChest;
  if (ease < 6) return "Près du corps";
  if (ease < 16) return "Coupe droite";
  if (ease < 30) return "Oversize";
  return "Très ample";
}
