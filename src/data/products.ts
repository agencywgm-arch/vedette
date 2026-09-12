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
  /** Position within the vertical (mobile) clip, which is cropped/panned differently. Falls back to x/y. */
  mobileX?: number;
  mobileY?: number;
  /** Not visible in the vertical clip's framing — skip the hotspot on mobile. */
  hideOnMobile?: boolean;
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
    mobileX: 15,
    mobileY: 35,
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
    mobileX: 12,
    mobileY: 75,
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
    mobileX: 20,
    mobileY: 52,
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
    mobileX: 88,
    mobileY: 30,
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
    hideOnMobile: true,
    revealAt: 0.97,
  },
];
