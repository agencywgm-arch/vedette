"use client";

import { useState } from "react";
import {
  SHIP_HELP,
  SHIP_LABEL,
  SHIP_STEPS,
  carrierName,
  trackingUrl,
  type PublicOrder,
} from "@/lib/shipping";

const KEY = "vedette:last-order";
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Remembers the last order so tracking opens pre-filled on the same device. */
export function rememberOrder(id: string, email: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, email }));
  } catch {}
}
function recall(): { id: string; email: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.id === "string" && typeof v.email === "string") return v;
  } catch {}
  return { id: "", email: "" };
}

export default function OrderTracker() {
  const [form, setForm] = useState(recall);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setOrder(data);
      rememberOrder(form.id.trim().toUpperCase(), form.email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const reached = (s: string) => order?.history.find((h) => h.status === s)?.at;
  const idx = order ? SHIP_STEPS.indexOf(order.status) : -1;
  const url = order ? trackingUrl(order.carrier, order.tracking) : undefined;

  return (
    <div className="track">
      <form onSubmit={lookup}>
        <input
          required
          placeholder="N° de commande (CMD-…)"
          value={form.id}
          maxLength={20}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="E-mail de la commande"
          value={form.email}
          maxLength={200}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {error && <p className="shop-drawer-error" role="alert">{error}</p>}
        <button className="shop-cta" disabled={busy}>{busy ? "Recherche…" : "Suivre ma commande"}</button>
      </form>

      {order && (
        <div className="track-card">
          <p className="track-id">
            <strong>{order.id}</strong>
            <span>{when(order.createdAt)}</span>
          </p>
          <p className={`track-now is-${order.status}`}>{SHIP_LABEL[order.status]}</p>
          <p className="track-help">{order.message || SHIP_HELP[order.status]}</p>

          {order.status === "annulee" ? null : (
            <ol className="track-steps">
              {SHIP_STEPS.map((s, i) => (
                <li key={s} className={i < idx ? "is-done" : i === idx ? "is-now" : undefined}>
                  <i aria-hidden="true" />
                  <span>
                    {SHIP_LABEL[s]}
                    {reached(s) && <small>{when(reached(s)!)}</small>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {order.tracking && (
            <p className="track-parcel">
              {carrierName(order.carrier) || "Transporteur"} · <code>{order.tracking}</code>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Suivre le colis →
                </a>
              )}
            </p>
          )}

          <ul className="track-lines">
            {order.lines.map((l, i) => (
              <li key={i}>
                {l.qty} × {l.name} <small>{l.color} · {l.size}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
