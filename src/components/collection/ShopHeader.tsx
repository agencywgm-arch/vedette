"use client";

import Image from "next/image";
import { useShopStore } from "@/store/useShopStore";

export default function ShopHeader() {
  const cartCount = useShopStore((s) => s.cart.length);

  return (
    <header className="shop-header">
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        priority
        className="shop-header-logo"
      />

      <nav className="shop-header-nav">
        <span className="is-active">Boutique</span>
        <span>Collections</span>
        <span>À propos</span>
        <span>Journal</span>
      </nav>

      <div className="shop-header-right">
        <span className="shop-header-cities">Paris / London / New York</span>
        <span className="shop-header-icons">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
          <span className="shop-header-bag">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8z" />
              <path d="M9 8V6a3 3 0 016 0v2" />
            </svg>
            <em>({cartCount})</em>
          </span>
        </span>
      </div>
    </header>
  );
}
