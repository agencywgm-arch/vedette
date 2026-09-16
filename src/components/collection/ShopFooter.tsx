import Image from "next/image";

export default function ShopFooter() {
  return (
    <footer className="shop-footer">
      <Image
        src="/logo-white.png"
        alt="vedette"
        width={1913}
        height={342}
        className="shop-footer-logo"
      />
      <span className="shop-footer-cities">Paris / London / New York</span>
      <span className="shop-footer-legal">© 2026 Vedette. Tous droits réservés.</span>
    </footer>
  );
}
