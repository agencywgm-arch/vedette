"use client";

import { useEffect, useState } from "react";
import { useShopStore } from "@/store/useShopStore";

/** What the customer sees when Stripe sends them back to the site. */
export default function PaymentReturn() {
  const clearCart = useShopStore((s) => s.clearCart);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const paid = q.get("paid");
    const cancelled = q.get("checkout") === "cancelled";
    if (!paid && !cancelled) return;
    if (paid) {
      clearCart();
      setMsg({ ok: true, text: `Paiement reçu — commande ${paid.replace(/[^A-Za-z0-9-]/g, "").slice(0, 24)} confirmée. Merci !` });
    } else {
      setMsg({ ok: false, text: "Paiement annulé. Ton panier est conservé." });
    }
    q.delete("paid");
    q.delete("checkout");
    const rest = q.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    const id = window.setTimeout(() => setMsg(null), 9000);
    return () => window.clearTimeout(id);
  }, [clearCart]);

  if (!msg) return null;
  return (
    <div
      role="status"
      onClick={() => setMsg(null)}
      style={{
        position: "fixed",
        top: "max(16px, env(safe-area-inset-top))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100000,
        maxWidth: "min(92vw, 520px)",
        padding: "12px 18px",
        borderRadius: 12,
        background: msg.ok ? "#f2c300" : "rgba(20,20,24,0.96)",
        color: msg.ok ? "#08080b" : "#fff",
        font: "600 14px/1.35 var(--font-geist-sans, system-ui)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        cursor: "pointer",
      }}
    >
      {msg.text}
    </div>
  );
}
