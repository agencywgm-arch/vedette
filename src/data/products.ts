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
   * runs from ~23.3% to ~76.7% of the frame height.
   */
  mobileX?: number;
  mobileY?: number;
  /** Scroll progress (0..1) at which this hotspot becomes visible. */
  revealAt: number;
  /** Optional close-up photo of the display/shelf, shown at the top of the product panel. */
  image?: string;
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
    x: 18,
    y: 42,
    mobileX: 18,
    mobileY: 45.7,
    revealAt: 0.84,
    image: "/products/shelf-display.jpg",
  },
  {
    id: "jparis-tee",
    name: "T-shirt J'♥ PARIS x vedette",
    tagline: "Collab exclusive",
    description:
      "Collab exclusive Paris en coton bio, coupe oversize. Disponible en noir et blanc, floqué avant/arrière.",
    price: "45€",
    x: 22,
    y: 68,
    mobileX: 22,
    mobileY: 59.6,
    revealAt: 0.9,
    image: "/products/shelf-display.jpg",
  },
  {
    id: "snapback",
    name: "Casquette Vedette Camo",
    tagline: "Accessoire",
    description:
      "Casquette camouflage noir, logo brodé et visière jaune fluo — la touche signature du staff.",
    price: "39€",
    x: 16,
    y: 30,
    mobileX: 16,
    mobileY: 39.3,
    revealAt: 0.9,
    image: "/products/shelf-display.jpg",
  },
  {
    id: "cabine",
    name: "Cabine d'essayage",
    tagline: "Espace boutique",
    description:
      "Essaie avant d'acheter — cabine privée avec canapé d'attente, juste devant l'écran vedette.",
    x: 37,
    y: 32,
    mobileX: 37,
    mobileY: 40.4,
    revealAt: 0.94,
  },
  {
    id: "counter",
    name: "Le Comptoir 24/7",
    tagline: "Snacks & essentials",
    description:
      "Boissons, snacks et essentiels du quotidien, ouvert 24/7. Paiement Visa, Mastercard et Apple Pay acceptés.",
    price: "Dès 2€",
    x: 78,
    y: 55,
    mobileX: 78,
    mobileY: 52.7,
    revealAt: 0.97,
  },
];
