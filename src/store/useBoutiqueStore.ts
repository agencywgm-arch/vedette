"use client";

import { create } from "zustand";
import type { ProductCategory } from "@/data/products";

export interface CartItem {
  productId: string;
  color: string;
  size: string;
}

interface BoutiqueState {
  selectedProductId: string | null;
  isInspecting: boolean;
  hoveredProductId: string | null;
  category: ProductCategory | "TOUS";
  cart: CartItem[];
  select: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setCategory: (c: ProductCategory | "TOUS") => void;
  addToCart: (item: CartItem) => void;
}

export const useBoutiqueStore = create<BoutiqueState>((set) => ({
  selectedProductId: null,
  isInspecting: false,
  hoveredProductId: null,
  category: "TOUS",
  cart: [],
  select: (id) => set({ selectedProductId: id, isInspecting: id !== null }),
  setHovered: (id) => set({ hoveredProductId: id }),
  setCategory: (c) => set({ category: c }),
  addToCart: (item) => set((s) => ({ cart: [...s.cart, item] })),
}));
