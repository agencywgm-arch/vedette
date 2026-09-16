"use client";

import Image from "next/image";
import { useCart } from "@/hooks/useCart";

export default function BoutiqueHeader() {
  const { count } = useCart();

  return (
    <header className="boutique-header">
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        className="boutique-header-logo"
      />
      <nav className="boutique-header-nav">
        <span className="is-active">Boutique</span>
        <span>Collections</span>
        <span>À propos</span>
        <span>Journal</span>
      </nav>
      <div className="boutique-header-right">
        <span className="boutique-header-cities">Paris / London / New York</span>
        <span className="boutique-header-cart">Panier ({count})</span>
      </div>
    </header>
  );
}
