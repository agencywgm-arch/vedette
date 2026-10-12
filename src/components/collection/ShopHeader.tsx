"use client";

import Image from "next/image";
import { useState } from "react";
import { useShopStore } from "@/store/useShopStore";
import CartDrawer from "./CartDrawer";
import HelpDrawer from "./HelpDrawer";
import InfoDrawer, { type InfoMode } from "./InfoDrawer";

export default function ShopHeader({ onPick }: { onPick: (id: string) => void }) {
  const cartCount = useShopStore((s) => s.cart.length);
  const [cartOpen, setCartOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [info, setInfo] = useState<InfoMode | null>(null);
  const setCategory = useShopStore((s) => s.setCategory);
  const select = useShopStore((s) => s.select);

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
        <button
          type="button"
          className="is-active"
          onClick={() => {
            setCategory("TOUS");
            select(null);
          }}
        >
          Boutique
        </button>
        <button type="button" onClick={() => setInfo("collections")}>Collections</button>
        <button type="button" onClick={() => setInfo("about")}>À propos</button>
        <button type="button" onClick={() => setInfo("journal")}>Journal</button>
      </nav>

      <div className="shop-header-right">
        <span className="shop-header-icons">
          <button
            type="button"
            className="shop-header-btn shop-header-menu"
            aria-label="Menu"
            onClick={() => setInfo("menu")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <button
            type="button"
            className="shop-header-btn"
            aria-label="Rechercher une pièce"
            onClick={() => setInfo("search")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </button>
          <button
            type="button"
            className="shop-header-btn"
            aria-label="Aide, retours et contact"
            onClick={() => setHelpOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </button>
          <button
            type="button"
            className="shop-header-btn shop-header-bag"
            aria-label={`Panier (${cartCount})`}
            onClick={() => setCartOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8z" />
              <path d="M9 8V6a3 3 0 016 0v2" />
            </svg>
            <em>({cartCount})</em>
          </button>
        </span>
      </div>
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      {info && (
        <InfoDrawer
          mode={info}
          onClose={() => setInfo(null)}
          onPick={(id) => {
            setInfo(null);
            onPick(id);
          }}
          onHelp={() => setHelpOpen(true)}
        />
      )}
      {helpOpen && <HelpDrawer onClose={() => setHelpOpen(false)} />}
    </header>
  );
}
