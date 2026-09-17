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
  /** Whether the current item's free companion accessory is toggled on. */
  bundleAccessory: boolean;
  select: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setCategory: (c: Category | "TOUS") => void;
  addToCart: (line: CartLine) => void;
  setBundleAccessory: (v: boolean) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  selectedId: null,
  hoveredId: null,
  category: "TOUS",
  cart: [],
  bundleAccessory: false,
  select: (id) => set({ selectedId: id, bundleAccessory: false }),
  setHovered: (id) => set({ hoveredId: id }),
  setCategory: (c) => set({ category: c }),
  addToCart: (line) => set((s) => ({ cart: [...s.cart, line] })),
  setBundleAccessory: (v) => set({ bundleAccessory: v }),
}));
