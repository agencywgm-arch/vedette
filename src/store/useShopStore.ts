"use client";

import { create } from "zustand";
import type { Category } from "@/data/collection";

export interface CartLine {
  itemId: string;
  color: string;
  size: string;
}

interface ShopState {
  selectedId: string | null;
  hoveredId: string | null;
  category: Category | "TOUS";
  cart: CartLine[];
  select: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setCategory: (c: Category | "TOUS") => void;
  addToCart: (line: CartLine) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  selectedId: null,
  hoveredId: null,
  category: "TOUS",
  cart: [],
  select: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setCategory: (c) => set({ category: c }),
  addToCart: (line) => set((s) => ({ cart: [...s.cart, line] })),
}));
