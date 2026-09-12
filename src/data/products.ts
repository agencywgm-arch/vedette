import { BOUNDARY } from "@/lib/video-timeline";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price?: string;
  tag?: string;
  /** Position of the clickable hotspot as a percentage of the video frame (desktop/landscape clip). */
  x: number;
  y: number;
  /**
   * Position within the vertical (mobile) clip's own 720x900 frame (not the
   * viewport — the clip renders with object-fit: contain and
   * ScrollVideoHero maps this into the actual on-screen rect). Full width is
   * preserved (mobileX == x); mobileY remaps y into the sharp band that
   * runs from ~27.1% to ~72.9% of the frame height.
   */
  mobileX?: number;
  mobileY?: number;
  /** Scroll progress (0..1, global across both clips) at which this hotspot becomes visible. */
  revealAt: number;
  /** Optional close-up photo of the display/shelf, shown at the top of the product panel. */
  image?: string;
  /** Size of the highlight frame drawn around the item, as a percentage of the video frame. */
  highlightWidth: number;
  highlightHeight: number;
}

/** Hotspots live in the collection phase; revealAtLocal is a fraction of
 * that phase's own timeline, converted to a global scroll fraction here. */
function revealInCollection(localFraction: number): number {
  return BOUNDARY + localFraction * (1 - BOUNDARY);
}

export const products: Product[] = [
  {
    id: "security-hoodie",
    name: "Hoodie SECURITY",
    tagline: "Best-seller",
    description:
      "Hoodie coton épais noir, imprimé \"SECURITY / vedette\" poitrine et dos. Porté avec cagoule et pantalon cargo ripstop, look agent de sécurité assumé.",
    price: "89€",
    tag: "Best-seller",
    x: 44,
    y: 22,
    mobileX: 44,
    mobileY: 37.2,
    revealAt: revealInCollection(0.8),
    image: "/products/shelf-display.jpg",
    highlightWidth: 8,
    highlightHeight: 20,
  },
  {
    id: "jparis-tee",
    name: "T-shirt J'♥ PARIS x vedette",
    tagline: "Collab exclusive",
    description:
      "Collab exclusive Paris en coton bio, coupe oversize. Disponible en noir et blanc, floqué avant/arrière.",
    price: "45€",
    x: 30,
    y: 22,
    mobileX: 30,
    mobileY: 37.2,
    revealAt: revealInCollection(0.86),
    image: "/products/shelf-display.jpg",
    highlightWidth: 8,
    highlightHeight: 20,
  },
  {
    id: "snapback",
    name: "Casquette Vedette Camo",
    tagline: "Accessoire",
    description:
      "Casquette camouflage noir, logo brodé et visière jaune fluo — la touche signature du staff.",
    price: "39€",
    x: 44,
    y: 45,
    mobileX: 44,
    mobileY: 47.7,
    revealAt: revealInCollection(0.83),
    image: "/products/shelf-display.jpg",
    highlightWidth: 8,
    highlightHeight: 10,
  },
  {
    id: "cabine",
    name: "Cabine d'essayage",
    tagline: "Espace boutique",
    description:
      "Essaie avant d'acheter — cabine privée avec canapé d'attente, juste devant l'écran vedette.",
    x: 89,
    y: 54,
    mobileX: 89,
    mobileY: 51.8,
    revealAt: revealInCollection(0.9),
    highlightWidth: 14,
    highlightHeight: 26,
  },
];
