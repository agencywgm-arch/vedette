"use client";

import { Suspense } from "react";
import ProductObject from "./ProductObject";
import { products } from "@/data/products";
import { useBoutiqueStore } from "@/store/useBoutiqueStore";

export default function ClothingDisplay() {
  const category = useBoutiqueStore((s) => s.category);
  const visible =
    category === "TOUS" ? products : products.filter((p) => p.category === category);

  return (
    <Suspense fallback={null}>
      {visible.map((p) => (
        <ProductObject key={p.id} product={p} />
      ))}
    </Suspense>
  );
}
