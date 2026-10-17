"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { collection, type Category } from "@/data/collection";

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
  removeFromCart: (index: number) => void;
  clearCart: () => void;
}

// The basket survives a reload on this device. Storage can be missing or
// refuse writes (private windows, blocked site data), so every access is
// guarded and the shop simply works without it.
const safeStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {}
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  },
};

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
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
      removeFromCart: (index) =>
        set((s) => ({ cart: s.cart.filter((_, i) => i !== index) })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "vedette:cart:v1",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ cart: s.cart }),
      // a line for a piece that no longer exists must not come back to life
      merge: (saved, current) => {
        const lines = (saved as { cart?: CartLine[] } | undefined)?.cart;
        const ok = Array.isArray(lines)
          ? lines
              .filter((l) => l && collection.some((c) => c.id === l.itemId && !c.locked))
              .slice(0, 20)
          : [];
        return { ...current, cart: ok };
      },
    },
  ),
);
