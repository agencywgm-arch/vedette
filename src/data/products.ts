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
   * Position within the vertical (mobile) clip. The mobile clip is the same
   * frame letterboxed onto a 9:19.5 canvas (blurred fill top/bottom, full
   * width preserved), so mobileX == x and mobileY is x/y remapped into the
   * sharp band that runs from ~34.6% to ~65.4% of the canvas height.
   */
  mobileX?: number;
  mobileY?: number;
  /** Scroll progress (0..1) at which this hotspot becomes visible. */
  revealAt: number;
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
    mobileY: 47.5,
    revealAt: 0.84,
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
    mobileY: 55.5,
    revealAt: 0.9,
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
    mobileY: 43.8,
    revealAt: 0.9,
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
    mobileY: 44.5,
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
    mobileY: 51.5,
    revealAt: 0.97,
  },
];
