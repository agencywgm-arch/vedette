export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  tag?: string;
  /** Position of the clickable hotspot in the interior scene */
  position: [number, number, number];
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
    position: [-3.4, 1.3, -5.5],
  },
  {
    id: "staff-apron",
    name: "Tablier STAFF",
    tagline: "Édition boutique",
    description:
      "Tablier vedette porté par l'équipe en boutique, à nouer dans le dos. Se superpose au hoodie noir. Badge \"vedette STAFF\" cousu.",
    price: "65€",
    position: [-1.1, 1.3, -6.4],
  },
  {
    id: "jparis-tee",
    name: "T-shirt J'♥ PARIS x vedette",
    tagline: "Collab exclusive",
    description:
      "Collab exclusive Paris en coton bio, coupe oversize. Disponible en noir et blanc, floqué avant/arrière.",
    price: "45€",
    position: [2.4, 1.5, -4.6],
  },
  {
    id: "snapback",
    name: "Casquette Vedette Camo",
    tagline: "Accessoire",
    description:
      "Casquette camouflage noir, logo brodé et visière jaune fluo — la touche signature du staff.",
    price: "39€",
    position: [3.6, 1.7, -5.8],
  },
  {
    id: "counter",
    name: "Le Comptoir 24/7",
    tagline: "Snacks & essentials",
    description:
      "Boissons, snacks et essentiels du quotidien, ouvert 24/7. Paiement Visa, Mastercard et Apple Pay acceptés.",
    price: "Dès 2€",
    position: [0.4, 1.1, -10.2],
  },
];
