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
   * Pulled from the wall to make room for the piece that replaced it there.
   * Still listed — greyed out with a padlock, not gone — but the rail and
   * the wall itself both refuse to open it.
   */
  locked?: boolean;
  /**
   * Folder of the VEDETTE mannequin wearing this exact piece in the cabine's
   * studio set: 8 shots every 45° (0.webp = front), spun by CabineViewer.
   */
  cabine?: string | null;
  /**
   * Other body types the piece has been shot on, for showing how the size
   * falls. List one only once its folder exists at
   * public/cabine/fit/<id>-<morph>/ with FIT_FRAMES shots (0.webp = front,
   * then every 45°). The cabine then offers a Mince / Médium / Large switch;
   * Médium is always the spin above.
   */
  fit?: Morph[];
  /** Women's spin exists at public/cabine/femme/<id>/ (FIT_FRAMES shots). */
  femme?: boolean;
  /**
   * A real photographed 360° turntable of the actual piece. When one exists
   * it takes over the floating inspector from both the GLB scan and the flat
   * packshots — same drag-to-spin gesture, real footage instead of a mesh.
   */
  turntable?: { mp4: string; webm: string } | null;
}

export type Morph = "mince" | "large";
/** Shots per fit view, every 45° like the Médium spin. */
export const FIT_FRAMES = 8;
export const MORPH_LABELS: Record<Morph | "medium", string> = {
  mince: "Mince",
  medium: "Médium",
  large: "Large",
};
export const femmeFolder = (id: string) => `/cabine/femme/${id}`;
export const femmeFitFolder = (id: string, morph: Morph) =>
  `/cabine/femme-${morph}/${id}`;
export const fitFolder = (id: string, morph: Morph) =>
  `/cabine/fit/${id}-${morph}`;

/** Intrinsic size of public/collection/wall.webp — hotspots are % of this. */
export const WALL_SIZE = { w: 1350, h: 1080 };
export const WALL_IMAGE = "/collection/wall.webp?v=2";

const P = "/collection/products/";
const C = "/cabine/looks/";
const T = "/collection/turntable/";

export const collection: CollectionItem[] = [
  {
    id: "jparis-tee",
    name: "J'♥ PARIS TEE",
    price: 59,
    category: "T-SHIRTS",
    description: "T-shirt en coton premium. Coupe oversize. Sérigraphie haute qualité.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 16.5, y: 19, w: 19, h: 33 },
    front: P + "jparis-tee-front.webp",
    back: P + "jparis-tee-back.webp",
    model: "/models/jparis-tee.glb",
    cabine: C + "jparis-tee",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "jparis-tee.mp4", webm: T + "jparis-tee.webm" },
  },
  {
    id: "champions-tee",
    name: "CHAMPIONS 2025 TEE",
    price: 65,
    category: "T-SHIRTS",
    description: "T-shirt noir imprimé all-over. Édition Champions 2025, tirage limité.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 35.8, y: 19, w: 19.6, h: 33 },
    front: P + "champions-tee-front.webp",
    back: P + "champions-tee-back.webp",
    model: "/models/champions-tee.glb",
    cabine: C + "champions-tee",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "champions-tee.mp4", webm: T + "champions-tee.webm" },
  },
  {
    id: "paris-polo",
    name: "POLO J'♥ PARIS",
    price: 110,
    category: "SWEATS",
    description: "Sweat col polo bleu marine, col blanc contrasté. Broderie dos signature.",
    colors: [{ name: "Marine", hex: "#1b2545" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 56.2, y: 19, w: 20.7, h: 33 },
    front: P + "paris-polo-front.webp",
    back: P + "paris-polo-back.webp",
    model: "/models/paris-polo.glb",
    cabine: C + "paris-polo",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "paris-polo.mp4", webm: T + "paris-polo.webm" },
  },
  {
    id: "vedette-vneck",
    name: "SWEAT COL V VEDETTE",
    price: 95,
    category: "SWEATS",
    description: "Sweat col V crème, liseré bleu. Inspiration maillot rétro.",
    colors: [{ name: "Crème", hex: "#efe7d4" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 77.7, y: 19, w: 20.3, h: 33 },
    front: P + "vedette-vneck-front.webp",
    back: P + "vedette-vneck-back.webp",
    model: "/models/vedette-vneck.glb",
    cabine: C + "vedette-vneck",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "vedette-vneck.mp4", webm: T + "vedette-vneck.webm" },
  },
  {
    id: "cap-vedette",
    name: "CASQUETTE VEDETTE PATCH",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette noire brodée multi-patchs. Ambiance paddock.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["TU"],
    spot: { x: 22.5, y: 53, w: 10.5, h: 13.5 },
    front: P + "cap-vedette-front.webp",
    back: P + "cap-vedette-back.webp",
    model: "/models/cap-vedette.glb",
    cabine: C + "cap-vedette",
    turntable: { mp4: T + "cap-vedette.mp4", webm: T + "cap-vedette.webm" },
  },
  {
    id: "cap-flames",
    name: "CASQUETTE RACING FLAMES",
    price: 45,
    category: "CASQUETTES",
    description: "Casquette blanche visière flammes, broderie circuit Paris.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["TU"],
    spot: { x: 40, y: 53, w: 12, h: 13.5 },
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
    spot: { x: 40, y: 53, w: 12, h: 13.5 },
    front: P + "cap-bienoufoie-front.webp",
    back: null,
    model: "/models/cap-bienoufoie.glb",
    cabine: C + "cap-bienoufoie",
    turntable: { mp4: T + "cap-bienoufoie.mp4", webm: T + "cap-bienoufoie.webm" },
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
    spot: { x: 60, y: 53, w: 12, h: 13.5 },
    front: P + "cap-camo-front.webp",
    back: null,
    model: "/models/cap-camo.glb",
    cabine: C + "cap-camo",
    turntable: { mp4: T + "cap-camo.mp4", webm: T + "cap-camo.webm" },
  },
  {
    id: "cap-heart",
    name: "CASQUETTE HEART BUCKLE",
    price: 49,
    category: "CASQUETTES",
    description: "Casquette marine logo cœur brodé, sangle boucle vedette.",
    colors: [{ name: "Marine", hex: "#1b2545" }],
    sizes: ["TU"],
    spot: { x: 80, y: 53, w: 12.5, h: 13.5 },
    front: P + "cap-heart-front.webp",
    back: null,
    model: "/models/cap-heart.glb",
    cabine: C + "cap-heart",
    turntable: { mp4: T + "cap-heart.mp4", webm: T + "cap-heart.webm" },
  },
  {
    id: "paris-longsleeve",
    name: "MANCHES LONGUES PARIS",
    price: 85,
    category: "SWEATS",
    description: "Manches longues blanc, print rose PARIS VEDETTE.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 17.8, y: 68, w: 15.6, h: 30 },
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
    spot: { x: 17.8, y: 68, w: 15.6, h: 30 },
    front: P + "boxe-khoya-tank-front.webp",
    back: null,
    model: "/models/boxe-khoya-tank.glb",
    cabine: C + "boxe-khoya-tank",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "boxe-khoya-tank.mp4", webm: T + "boxe-khoya-tank.webm" },
  },
  {
    id: "forreal-tee",
    name: "FORREAL TEE",
    price: 59,
    category: "T-SHIRTS",
    description: "T-shirt noir, illustration FORREAL grand format.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 34.1, y: 68, w: 14.8, h: 30 },
    front: P + "forreal-tee-front.webp",
    back: null,
    model: "/models/forreal-tee.glb",
    cabine: C + "forreal-tee",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "forreal-tee.mp4", webm: T + "forreal-tee.webm" },
  },
  {
    id: "rainbow-jersey",
    name: "MAILLOT VEDETTE RAINBOW",
    price: 75,
    category: "MAILLOTS",
    description: "Maillot mesh sans manches, bandes arc-en-ciel, numéro 92 floqué au dos.",
    colors: [{ name: "Blanc", hex: "#f4f2ec" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 49.6, y: 68, w: 14.1, h: 30 },
    front: P + "rainbow-jersey-front.webp",
    back: P + "rainbow-jersey-back.webp",
    cabine: C + "rainbow-jersey",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "rainbow-jersey.mp4", webm: T + "rainbow-jersey.webm" },
  },
  {
    id: "jparis-sweat",
    name: "SWEAT J'♥ PARIS",
    price: 89,
    category: "SWEATS",
    description: "Sweat gris chiné, print J'♥ PARIS poitrine. Le basique de la collection.",
    colors: [{ name: "Gris", hex: "#9a9a9a" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 63.7, y: 68, w: 18.5, h: 30 },
    front: P + "jparis-sweat-front.webp",
    back: null,
    model: "/models/jparis-sweat.glb",
    cabine: C + "jparis-sweat",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "jparis-sweat.mp4", webm: T + "jparis-sweat.webm" },
  },
  {
    id: "black-jacket",
    name: "VESTE VOLEUR",
    price: 220,
    category: "VESTES",
    description: "Veste en cuir noir, zips et pressions métal. Dos sérigraphié VOLEUR.",
    colors: [{ name: "Noir", hex: "#111111" }],
    sizes: ["S", "M", "L", "XL"],
    spot: { x: 82.2, y: 68, w: 17.5, h: 30 },
    front: P + "black-jacket-front.webp",
    back: P + "black-jacket-back.webp",
    model: "/models/black-jacket.glb",
    accessory: { name: "Cagoule Vedette", model: "/models/balaclava.glb" },
    cabine: C + "black-jacket",
    fit: ["mince", "large"],
    femme: true,
    turntable: { mp4: T + "black-jacket.mp4", webm: T + "black-jacket.webm" },
  },
  {
    id: "sac-vedette",
    name: "SAC VEDETTE",
    price: 150,
    category: "ACCESSOIRES",
    description:
      "Sac en cuir grainé bleu ciel, fermoir tourniquet métal, logo vedette. Anneaux au dos pour le porter en sac à dos.",
    colors: [{ name: "Bleu ciel", hex: "#5a9fb8" }],
    sizes: ["TU"],
    spot: { x: 0.2, y: 46, w: 12, h: 12.5 },
    front: P + "sac-vedette-front.webp",
    back: null,
    cabine: C + "sac-vedette",
    turntable: { mp4: T + "sac-vedette.mp4", webm: T + "sac-vedette.webm" },
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
