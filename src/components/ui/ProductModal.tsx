"use client";

import { useSceneStore } from "@/store/useSceneStore";
import { products } from "@/data/products";

export default function ProductModal() {
  const activeProductId = useSceneStore((s) => s.activeProductId);
  const setActiveProductId = useSceneStore((s) => s.setActiveProductId);
  const product = products.find((p) => p.id === activeProductId) ?? null;

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-end transition-all duration-300 ${
        product ? "pointer-events-auto bg-black/50" : "pointer-events-none bg-black/0"
      }`}
      onClick={() => setActiveProductId(null)}
    >
      <div
        className={`h-full w-full max-w-sm bg-[#0d0d10] text-white shadow-2xl transition-transform duration-300 ease-out ${
          product ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {product && (
          <div className="flex h-full flex-col p-6 fade-in">
            <button
              onClick={() => setActiveProductId(null)}
              className="mb-8 self-end text-xs uppercase tracking-widest text-white/50 hover:text-white"
            >
              Fermer ✕
            </button>
            {product.tag && (
              <span className="mb-2 w-fit rounded-full bg-[#f2c300] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                {product.tag}
              </span>
            )}
            <h2 className="text-2xl font-black">{product.name}</h2>
            <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
              {product.tagline}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-white/80">
              {product.description}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-xl font-bold text-[#f2c300]">{product.price}</span>
              <button className="rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wide text-black transition-transform hover:scale-105 active:scale-95">
                Ajouter au panier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
