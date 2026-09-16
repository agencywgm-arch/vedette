"use client";

import { useBoutiqueStore } from "@/store/useBoutiqueStore";

export function useCart() {
  const cart = useBoutiqueStore((s) => s.cart);
  const addToCart = useBoutiqueStore((s) => s.addToCart);
  return { cart, count: cart.length, addToCart };
}
