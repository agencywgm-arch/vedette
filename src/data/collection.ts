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
}

/** Intrinsic size of public/collection/wall.webp — hotspots are % of this. */
export const WALL_SIZE = { w: 2880, h: 2160 };
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
    spot: { x: 23.5, y: 37.5, w: 13, h: 24 },
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
    spot: { x: 39.5, y: 37, w: 13.5, h: 24 },
    front: P + "champions-tee-front.webp",
    back: P + "champions-tee-back.webp",
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
    spot: { x: 57, y: 37, w: 14.5, h: 24 },
    front: P + "paris-polo-front.webp",
    back: P + "paris-polo-back.webp",
  },
  {
    id: "vedette-vneck",
    name: "SWEAT COL V VEDETTE",
    price: 95,
    category: "SWEATS",
    description: "Sweat col V crème, liseré bleu. Inspiration maillot rétro.",
    colors: [{ name: "Crème", hex: "#efe7d4" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 73.5, y: 36.5, w: 16.5, h: 24 },
    front: null,
    back: null,
  },
  {
    id: "cap-vedette",
    name: "CASQUETTE VEDETTE PATCH",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette noire brodée multi-patchs. Ambiance paddock.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["TU"],
    spot: { x: 23.5, y: 56, w: 8, h: 8.5 },
    front: P + "cap-vedette-front.webp",
    back: P + "cap-vedette-back.webp",
    model: "/models/cap-vedette.glb",
  },
  {
    id: "cap-flames",
    name: "CASQUETTE RACING FLAMES",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette blanche visière flammes, broderie circuit Paris.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["TU"],
    spot: { x: 38.5, y: 56, w: 8.5, h: 9 },
    front: P + "cap-flames-front.webp",
    back: null,
    model: "/models/cap-flames.glb",
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
    spot: { x: 55.5, y: 56, w: 8.5, h: 8.5 },
    front: P + "cap-camo-front.webp",
    back: null,
  },
  {
    id: "cap-heart",
    name: "CASQUETTE HEART BUCKLE",
    price: 49,
    category: "CASQUETTES",
    description: "Casquette marine logo cœur brodé, sangle boucle vedette.",
    colors: [{ name: "Marine", hex: "#1b2545" }],
    sizes: ["TU"],
    spot: { x: 72, y: 56, w: 9, h: 9 },
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
    spot: { x: 21, y: 75, w: 13, h: 27 },
    front: null,
    back: null,
  },
  {
    id: "forreal-tee",
    name: "FORREAL TEE",
    price: 59,
    category: "T-SHIRTS",
    description: "T-shirt noir, illustration FORREAL grand format.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 35, y: 75, w: 11, h: 27 },
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
    spot: { x: 48, y: 75, w: 12.5, h: 27 },
    front: P + "rainbow-jersey-front.webp",
    back: P + "rainbow-jersey-back.webp",
  },
  {
    id: "jparis-sweat",
    name: "SWEAT J'♥ PARIS",
    price: 89,
    category: "SWEATS",
    description: "Sweat gris chiné, print J'♥ PARIS poitrine. Le basique de la collection.",
    colors: [{ name: "Gris", hex: "#9a9a9a" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 61, y: 75, w: 12.5, h: 27 },
    front: P + "jparis-sweat-front.webp",
    back: null,
  },
  {
    id: "black-jacket",
    name: "VESTE VOLEUR",
    price: 220,
    category: "VESTES",
    description: "Veste en cuir noir, zips et pressions métal. Dos sérigraphié VOLEUR.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 75, y: 75, w: 12, h: 27 },
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

/** Carousel tile — cropped straight out of the wall still, so the rail always
 * mirrors what is actually hanging in the room. */
export function thumbFor(id: string) {
  return `/collection/thumbs/${id}.webp`;
}
