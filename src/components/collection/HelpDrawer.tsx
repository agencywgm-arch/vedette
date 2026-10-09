"use client";

import { useState } from "react";

type Mode = "support" | "returns";

export default function HelpDrawer({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("support");
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "", orderId: "", itemName: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body =
      mode === "support"
        ? { name: f.name, email: f.email, subject: f.subject, message: f.message }
        : { name: f.name, email: f.email, orderId: f.orderId, itemName: f.itemName, reason: f.reason };
    try {
      const res = await fetch(mode === "support" ? "/api/support" : "/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDone(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-drawer-backdrop" onClick={onClose}>
      <aside className="shop-drawer" role="dialog" aria-label="Aide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shop-drawer-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2>Aide</h2>
        {done ? (
          <p className="shop-drawer-ok">
            Demande <strong>{done}</strong> reçue. Nous te répondons par e-mail.
          </p>
        ) : (
          <>
            <div className="shop-drawer-tabs">
              <button type="button" aria-pressed={mode === "support"} onClick={() => setMode("support")}>
                Contact
              </button>
              <button type="button" aria-pressed={mode === "returns"} onClick={() => setMode("returns")}>
                Retour
              </button>
            </div>
            <form onSubmit={submit}>
              <input required placeholder="Nom" value={f.name} maxLength={80} onChange={set("name")} />
              <input required type="email" placeholder="E-mail" value={f.email} maxLength={200} onChange={set("email")} />
              {mode === "support" ? (
                <>
                  <input required placeholder="Sujet" value={f.subject} maxLength={140} onChange={set("subject")} />
                  <textarea required placeholder="Ton message" rows={5} value={f.message} maxLength={2000} onChange={set("message")} />
                </>
              ) : (
                <>
                  <input required placeholder="N° de commande (CMD-…)" value={f.orderId} maxLength={20} onChange={set("orderId")} />
                  <input required placeholder="Article à retourner" value={f.itemName} maxLength={120} onChange={set("itemName")} />
                  <textarea required placeholder="Motif du retour" rows={4} value={f.reason} maxLength={1000} onChange={set("reason")} />
                </>
              )}
              {error && <p className="shop-drawer-error" role="alert">{error}</p>}
              <button className="shop-cta" disabled={busy}>{busy ? "Envoi…" : "Envoyer"}</button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
