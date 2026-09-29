import type { Spot } from "@/lib/media-rect";

export type Category =
  | "T-SHIRTS"
  | "SWEATS"
  | "VESTES"
  | "MAILLOTS"
  | "CASQUETTES"
  | "ACCESSOIRES"
  | "PANTALONS";

export interface Colorway {
  name: string;
  hex: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  colors: Colorway[];
  sizes: string[];
  /** Where the piece hangs on the wall still, in % of that image's frame. */
  spot: Spot;
  /**
   * Cut-out packshots. `front: null` means the packshot hasn't landed yet —
   * the piece stays in the scene but isn't selectable, rather than shipping a
   * blurry crop of the wall in its place.
   */
  front: string | null;
  back: string | null;
  /**
   * A real scanned model of the piece. When one exists it replaces the two
   * flat faces entirely: the piece turns in actual space rather than flipping
   * between two photographs. `null` falls back to the packshots.
   */
  model?: string | null;
  /**
   * A free companion piece shown turning alongside this one in the
   * inspector when the shopper opts in — never sold or listed on its own.
   */
  accessory?: { name: string; model: string } | null;
  /**
   * Real photos of the actual piece worn, cropped from community/press
   * shots — shown alongside the studio scan or packshots, never in place
   * of them.
   */
  lifestyle?: string[];
  /**
   * Pulled from the wall to make room for the piece that replaced it there.
   * Still listed — greyed out with a padlock, not gone — but the rail and
   * the wall itself both refuse to open it.
   */
  locked?: boolean;
}

/** Intrinsic size of public/collection/wall.webp — hotspots are % of this. */
export const WALL_SIZE = { w: 1080, h: 1440 };
export const WALL_IMAGE = "/collection/wall.webp";

const P = "/collection/products/";

export const collection: CollectionItem[] = [
  {
    id: "jparis-tee",
    name: "J'♥ PARIS TEE",
    price: 59,
    category: "T-SHIRTS",
    description: "T-shirt en coton premium. Coupe oversize. Sérigraphie haute qualité.",
    colors: [
      { name: "Blanc", hex: "#f4f2ec" },
      { name: "Noir", hex: "#111111" },
      { name: "Gris", hex: "#6f7071" },
      { name: "Rose", hex: "#f2a7bb" },
    ],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 16.67, y: 39.58, w: 20.37, h: 18.06 },
    front: P + "jparis-tee-front.webp",
    back: null,
    model: "/models/jparis-tee.glb",
  },
  {
    id: "champions-tee",
    name: "CHAMPIONS 2025 TEE",
    price: 65,
    category: "T-SHIRTS",
    description: "T-shirt noir imprimé all-over. Édition Champions 2025, tirage limité.",
    colors: [
      { name: "Noir", hex: "#111111" },
      { name: "Blanc", hex: "#f4f2ec" },
    ],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 36.11, y: 39.58, w: 20.37, h: 18.06 },
    front: P + "champions-tee-front.webp",
    back: P + "champions-tee-back.webp",
    model: "/models/champions-tee.glb",
  },
  {
    id: "paris-polo",
    name: "POLO J'♥ PARIS",
    price: 110,
    category: "SWEATS",
    description: "Sweat col polo bleu marine, col blanc contrasté. Broderie dos signature.",
    colors: [
      { name: "Marine", hex: "#1b2545" },
      { name: "Blanc", hex: "#f4f2ec" },
    ],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 57.41, y: 39.58, w: 22.22, h: 18.06 },
    front: P + "paris-polo-front.webp",
    back: P + "paris-polo-back.webp",
    model: "/models/paris-polo.glb",
  },
  {
    id: "vedette-vneck",
    name: "SWEAT COL V VEDETTE",
    price: 95,
    category: "SWEATS",
    description: "Sweat col V crème, liseré bleu. Inspiration maillot rétro.",
    colors: [{ name: "Crème", hex: "#efe7d4" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 79.63, y: 39.58, w: 20.37, h: 18.06 },
    front: P + "vedette-vneck-front.webp",
    back: null,
    model: "/models/vedette-vneck.glb",
  },
  {
    id: "cap-vedette",
    name: "CASQUETTE VEDETTE PATCH",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette noire brodée multi-patchs. Ambiance paddock.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["TU"],
    spot: { x: 19.44, y: 52.78, w: 20.37, h: 6.25 },
    front: P + "cap-vedette-front.webp",
    back: P + "cap-vedette-back.webp",
    model: "/models/cap-vedette.glb",
    lifestyle: [
      "/collection/lifestyle/cap-vedette-1.webp",
      "/collection/lifestyle/cap-vedette-2.webp",
      "/collection/lifestyle/cap-vedette-3.webp",
    ],
  },
  {
    id: "cap-flames",
    name: "CASQUETTE RACING FLAMES",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette blanche visière flammes, broderie circuit Paris.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["TU"],
    spot: { x: 40.74, y: 52.78, w: 20.37, h: 6.25 },
    front: P + "cap-flames-front.webp",
    back: null,
    model: "/models/cap-flames.glb",
    locked: true,
  },
  {
    id: "cap-bienoufoie",
    name: "CASQUETTE BIEN OU FOIE",
    price: 49,
    category: "CASQUETTES",
    description: "Collab Bien ou Foie × Vedette. Casquette orange, broderie exclusive.",
    colors: [{ name: "Orange", hex: "#e8600f" }],
    sizes: ["TU"],
    spot: { x: 40.74, y: 52.78, w: 20.37, h: 6.25 },
    front: P + "cap-bienoufoie-front.webp",
    back: null,
    model: "/models/cap-bienoufoie.glb",
  },
  {
    id: "cap-camo",
    name: "CASQUETTE CAMO",
    price: 45,
    category: "CASQUETTES",
    description:
      "Camo digital noir, liseré jaune fluo sous la visière, sangle réglable à boucle D.",
    colors: [{ name: "Camo", hex: "#23231f" }],
    sizes: ["TU"],
    spot: { x: 61.57, y: 52.78, w: 20.37, h: 6.25 },
    front: P + "cap-camo-front.webp",
    back: null,
    model: "/models/cap-camo.glb",
  },
  {
    id: "cap-heart",
    name: "CASQUETTE HEART BUCKLE",
    price: 49,
    category: "CASQUETTES",
    description: "Casquette marine logo cœur brodé, sangle boucle vedette.",
    colors: [{ name: "Marine", hex: "#1b2545" }],
    sizes: ["TU"],
    spot: { x: 82.41, y: 52.78, w: 20.37, h: 6.25 },
    front: P + "cap-heart-front.webp",
    back: null,
    model: "/models/cap-heart.glb",
  },
  {
    id: "paris-longsleeve",
    name: "MANCHES LONGUES PARIS",
    price: 85,
    category: "SWEATS",
    description: "Manches longues blanc, print rose PARIS VEDETTE.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 18.52, y: 67.71, w: 20.37, h: 18.06 },
    front: P + "paris-longsleeve-front.webp",
    back: null,
    model: "/models/paris-longsleeve.glb",
    locked: true,
  },
  {
    id: "boxe-khoya-tank",
    name: "DÉBARDEUR FULL BOXE KHOYA",
    price: 79,
    category: "T-SHIRTS",
    description: "Collab Bien ou Foie × Vedette. Débardeur noir imprimé all-over, tirage limité.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 18.52, y: 67.71, w: 20.37, h: 18.06 },
    front: P + "boxe-khoya-tank-front.webp",
    back: null,
    model: "/models/boxe-khoya-tank.glb",
  },
  {
    id: "forreal-tee",
    name: "FORREAL TEE",
    price: 59,
    category: "T-SHIRTS",
    description: "T-shirt noir, illustration FORREAL grand format.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 34.72, y: 67.71, w: 20.37, h: 18.06 },
    front: P + "forreal-tee-front.webp",
    back: null,
    model: "/models/forreal-tee.glb",
  },
  {
    id: "rainbow-jersey",
    name: "MAILLOT VEDETTE RAINBOW",
    price: 75,
    category: "MAILLOTS",
    description: "Maillot mesh sans manches, bandes arc-en-ciel, numéro 92 floqué au dos.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 49.07, y: 67.71, w: 17.59, h: 18.06 },
    front: P + "rainbow-jersey-front.webp",
    back: P + "rainbow-jersey-back.webp",
    lifestyle: [
      "/collection/lifestyle/rainbow-jersey-1.webp",
      "/collection/lifestyle/rainbow-jersey-2.webp",
    ],
  },
  {
    id: "jparis-sweat",
    name: "SWEAT J'♥ PARIS",
    price: 89,
    category: "SWEATS",
    description: "Sweat gris chiné, print J'♥ PARIS poitrine. Le basique de la collection.",
    colors: [{ name: "Gris", hex: "#9a9a9a" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 64.81, y: 67.71, w: 17.59, h: 18.06 },
    front: P + "jparis-sweat-front.webp",
    back: null,
    model: "/models/jparis-sweat.glb",
  },
  {
    id: "black-jacket",
    name: "VESTE VOLEUR",
    price: 220,
    category: "VESTES",
    description: "Veste en cuir noir, zips et pressions métal. Dos sérigraphié VOLEUR.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 82.41, y: 67.71, w: 17.59, h: 18.06 },
    front: P + "black-jacket-front.webp",
    back: P + "black-jacket-back.webp",
    model: "/models/black-jacket.glb",
    accessory: { name: "Cagoule Vedette", model: "/models/balaclava.glb" },
  },
];

export const categories: (Category | "TOUS")[] = [
  "TOUS",
  "T-SHIRTS",
  "SWEATS",
  "VESTES",
  "MAILLOTS",
  "CASQUETTES",
  "ACCESSOIRES",
  "PANTALONS",
];

/** Only pieces whose packshot has landed can be lifted off the wall. */
export const selectableItems = collection.filter((i) => i.front !== null);

/** Carousel tile. For a scanned piece it's rendered straight from the 3D
 * model (same lighting rig as ModelStage), matching what actually turns in
 * the inspector; a piece still waiting on its scan falls back to a crop of
 * the wall still. */
export function thumbFor(id: string) {
  return `/collection/thumbs/${id}.webp`;
}
