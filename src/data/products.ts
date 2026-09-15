import { BOUNDARY } from "@/lib/video-timeline";
import type { GarmentModel } from "@/components/ui/ProductViewer3D";

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
   * preserved (mobileX == x) since the vertical encode letterboxes rather
   * than crops horizontally; mobileY remaps y into the sharp content band,
   * which runs from 20% to 80% of the frame height for this clip.
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
  /** Which procedural 3D silhouette the collection viewer builds for this item. */
  model: GarmentModel;
}

/** Hotspots live in the collection phase; revealAtLocal is a fraction of
 * that phase's own timeline, converted to a global scroll fraction here. */
function revealInCollection(localFraction: number): number {
  return BOUNDARY + localFraction * (1 - BOUNDARY);
}

export const products: Product[] = [
  {
    id: "jparis-tee",
    name: "T-shirt J'♥ PARIS x vedette",
    tagline: "Collab exclusive",
    description:
      "Collab exclusive Paris en coton bio, coupe oversize. Disponible en noir et blanc, floqué avant/arrière.",
    price: "45€",
    tag: "Best-seller",
    x: 15.7,
    y: 37,
    mobileX: 15.7,
    mobileY: 42.2,
    revealAt: revealInCollection(0.82),
    image: "/products/jparis-tee.jpg",
    highlightWidth: 14,
    highlightHeight: 22,
    model: "tee",
  },
  {
    id: "security-hoodie",
    name: "Sweat SECURITY",
    tagline: "Best-seller",
    description:
      "Sweat coton épais gris, imprimé \"J'♥ PARIS / vedette\" poitrine. Coupe droite, capuche doublée — le basique de la collection.",
    price: "89€",
    x: 56,
    y: 76.8,
    mobileX: 56,
    mobileY: 66.1,
    revealAt: revealInCollection(0.85),
    image: "/products/security-hoodie.jpg",
    highlightWidth: 14,
    highlightHeight: 22,
    model: "hoodie",
  },
  {
    id: "snapback",
    name: "Casquette Vedette",
    tagline: "Accessoire",
    description:
      "Casquette noire logo brodé \"V\" — la touche signature du staff, disponible en plusieurs coloris.",
    price: "39€",
    x: 16.6,
    y: 55.5,
    mobileX: 16.6,
    mobileY: 53.3,
    revealAt: revealInCollection(0.88),
    image: "/products/snapback.jpg",
    highlightWidth: 10,
    highlightHeight: 10,
    model: "cap",
  },
];
