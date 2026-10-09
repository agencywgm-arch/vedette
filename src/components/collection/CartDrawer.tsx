"use client";

import { useState } from "react";
import { collection } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const cart = useShopStore((s) => s.cart);
  const removeFromCart = useShopStore((s) => s.removeFromCart);
  const clearCart = useShopStore((s) => s.clearCart);
  const [form, setForm] = useState({ name: "", email: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const lines = cart.flatMap((l, index) => {
    const item = collection.find((c) => c.id === l.itemId);
    return item ? [{ ...l, index, item }] : [];
  });
  const total = lines.reduce((t, l) => t + l.item.price, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          lines: lines.map((l) => ({ itemId: l.itemId, color: l.color, size: l.size, qty: 1 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDone(data.id);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-drawer-backdrop" onClick={onClose}>
      <aside
        className="shop-drawer"
        role="dialog"
        aria-label="Panier"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="shop-drawer-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2>Panier</h2>
        {done ? (
          <p className="shop-drawer-ok">
            Commande <strong>{done}</strong> enregistrée. Notre équipe te contacte par e-mail pour
            le paiement et l&apos;expédition.
          </p>
        ) : lines.length === 0 ? (
          <p className="shop-drawer-empty">Ton panier est vide.</p>
        ) : (
          <form onSubmit={submit}>
            <ul className="shop-drawer-lines">
              {lines.map((l) => (
                <li key={l.index}>
                  <span>
                    {l.item.name}
                    <small>
                      {l.color} · {l.size}
                    </small>
                  </span>
                  <span>{euro(l.item.price)}</span>
                  <button type="button" onClick={() => removeFromCart(l.index)} aria-label="Retirer">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <p className="shop-drawer-total">
              Total <strong>{euro(total)}</strong>
            </p>
            <input required placeholder="Nom complet" value={form.name} maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required type="email" placeholder="E-mail" value={form.email} maxLength={200}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Ville" value={form.city} maxLength={80}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
            {error && <p className="shop-drawer-error" role="alert">{error}</p>}
            <button className="shop-cta" disabled={busy}>
              {busy ? "Envoi…" : "Valider la commande"}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
