export type ProductCategory =
  | "T-SHIRTS"
  | "SWEATS"
  | "VESTES"
  | "MAILLOTS"
  | "CASQUETTES"
  | "ACCESSOIRES"
  | "PANTALONS";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  image: string;
  description: string;
  colors: string[];
  sizes: string[];
  /** Where this item hangs on the display wall. */
  position: [number, number, number];
  rotation: [number, number, number];
}

export const products: Product[] = [
  {
    id: "jparis-tee",
    name: "J'♥ PARIS TEE",
    price: 45,
    category: "T-SHIRTS",
    image: "/products/jparis-tee-white.webp",
    description: "T-shirt en coton premium. Coupe oversize. Sérigraphie haute qualité.",
    colors: ["#f5f5f0", "#0a0a0a", "#8b8b93"],
    sizes: ["S", "M", "L", "XL"],
    position: [-4.5, 1.8, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "club-sweater",
    name: "SWEAT CLUB VEDETTE",
    price: 89,
    category: "SWEATS",
    image: "/products/cream-soccer-sweater.webp",
    description: "Sweat col v style maillot rétro, brodé poitrine et manche. Coupe droite.",
    colors: ["#efe6d3", "#0a0a0a"],
    sizes: ["S", "M", "L", "XL"],
    position: [-1.5, 1.8, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "security-sweat",
    name: "SWEAT SECURITY",
    price: 89,
    category: "SWEATS",
    image: "/products/navy-sweatshirt-back.webp",
    description: "Sweat coton épais bleu marine, brodé \"Snob, Vilain et Arrogant\" au dos.",
    colors: ["#0f2049", "#0a0a0a"],
    sizes: ["S", "M", "L", "XL"],
    position: [1.5, 1.8, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "rugby-sweat",
    name: "POLO J'PARIS RUGBY",
    price: 95,
    category: "SWEATS",
    image: "/products/navy-rugby-sweatshirt.webp",
    description: "Sweat col rugby bleu marine et blanc, floqué \"J'♥ PARIS\" poitrine.",
    colors: ["#0f2049", "#f5f5f0"],
    sizes: ["S", "M", "L", "XL"],
    position: [4.5, 1.8, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "cap-multipatch",
    name: "CASQUETTE MULTI-PATCH",
    price: 39,
    category: "CASQUETTES",
    image: "/products/cap-multipatch-black.webp",
    description: "Casquette noire brodée multi-logos, ambiance paddock.",
    colors: ["#0a0a0a"],
    sizes: ["Unique"],
    position: [-3, 0.2, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "cap-racing",
    name: "CASQUETTE RACING GP",
    price: 45,
    category: "CASQUETTES",
    image: "/products/cap-racing-flames.webp",
    description: "Casquette blanche visière flammes, brodée circuit Paris.",
    colors: ["#f5f5f0"],
    sizes: ["Unique"],
    position: [0, 0.2, -3],
    rotation: [0, 0, 0],
  },
  {
    id: "cap-heart",
    name: "CASQUETTE HEART BUCKLE",
    price: 39,
    category: "CASQUETTES",
    image: "/products/cap-navy-heart.webp",
    description: "Casquette bleu marine logo cœur brodé, sangle boucle vedette.",
    colors: ["#0f2049"],
    sizes: ["Unique"],
    position: [3, 0.2, -3],
    rotation: [0, 0, 0],
  },
];

export const categories: (ProductCategory | "TOUS")[] = [
  "TOUS",
  "T-SHIRTS",
  "SWEATS",
  "VESTES",
  "MAILLOTS",
  "CASQUETTES",
  "ACCESSOIRES",
  "PANTALONS",
];
