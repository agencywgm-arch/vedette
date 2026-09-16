"use client";

import { useBoutiqueStore } from "@/store/useBoutiqueStore";
import { products } from "@/data/products";

export function useProductSelection() {
  const selectedProductId = useBoutiqueStore((s) => s.selectedProductId);
  const isInspecting = useBoutiqueStore((s) => s.isInspecting);
  const select = useBoutiqueStore((s) => s.select);
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  return {
    selectedProduct,
    isInspecting,
    select,
    close: () => select(null),
  };
}
