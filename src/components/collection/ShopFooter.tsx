"use client";

import Image from "next/image";
import { useState } from "react";
import HelpDrawer from "./HelpDrawer";

export default function ShopFooter() {
  const [help, setHelp] = useState<null | "support" | "tracking">(null);
  return (
    <footer className="shop-footer">
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        className="shop-footer-logo"
      />
      <span className="shop-footer-links">
        <button type="button" className="shop-footer-link" onClick={() => setHelp("tracking")}>
          Suivre ma commande
        </button>
        <button type="button" className="shop-footer-link" onClick={() => setHelp("support")}>
          Aide · Retours · Contact
        </button>
      </span>
      <span className="shop-footer-legal">© 2026 Vedette. Tous droits réservés.</span>
      {help && <HelpDrawer initial={help} onClose={() => setHelp(null)} />}
    </footer>
  );
}
