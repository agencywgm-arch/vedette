"use client";

import Image from "next/image";
import { useState } from "react";
import HelpDrawer from "./HelpDrawer";

export default function ShopFooter() {
  const [help, setHelp] = useState(false);
  return (
    <footer className="shop-footer">
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        className="shop-footer-logo"
      />
      <button type="button" className="shop-footer-link" onClick={() => setHelp(true)}>
        Aide · Retours · Contact
      </button>
      <span className="shop-footer-legal">© 2026 Vedette. Tous droits réservés.</span>
      {help && <HelpDrawer onClose={() => setHelp(false)} />}
    </footer>
  );
}
