"use client";

import { useEffect, useState } from "react";
import { SHIP_LABEL, SHIP_STEPS, carrierName, trackingUrl, type PublicOrder } from "@/lib/shipping";

const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type View = "loading" | "login" | "sent" | "orders" | "expired";

export default function ComptePage() {
  const [view, setView] = useState<View>("loading");
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadOrders(): Promise<boolean> {
    const r = await fetch("/api/account/orders", { cache: "no-store" });
    if (!r.ok) return false;
    const d = (await r.json()) as { email: string; orders: PublicOrder[] };
    setEmail(d.email);
    setOrders(d.orders);
    setView("orders");
    return true;
  }

  useEffect(() => {
    (async () => {
      try {
        const t = new URLSearchParams(location.search).get("t");
        if (t) {
          history.replaceState(null, "", "/compte");
          const v = await fetch("/api/account/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: t }),
          });
          if (!v.ok) return setView("expired");
        }
        if (!(await loadOrders())) setView("login");
      } catch {
        setView("login");
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.status === 429) setError("Trop de demandes, réessaie dans quelques minutes.");
      else if (!r.ok) setError("Service momentanément indisponible.");
      else setView("sent");
    } catch {
      setError("Connexion impossible.");
    }
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => {});
    setOrders([]);
    setEmail("");
    setView("login");
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        required
        type="email"
        autoComplete="email"
        placeholder="Ton e-mail de commande"
        value={email}
        maxLength={200}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[#f2c300]"
      />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-[#f2c300] px-4 py-3 font-bold text-black disabled:opacity-60">
        {busy ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
    </form>
  );

  return (
    <main className="min-h-dvh bg-[#08080b] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <a href="/" className="text-sm text-white/60 underline">← Retour à la boutique</a>
        <h1 className="text-3xl font-extrabold tracking-tight">Mes commandes</h1>

        {view === "loading" && <p className="text-white/60">Chargement…</p>}

        {view === "login" && (
          <>
            <p className="text-white/70">
              Pas de mot de passe : entre l’e-mail utilisé pour ta commande et tu reçois un lien de connexion valable 15 minutes.
            </p>
            {form}
          </>
        )}

        {view === "expired" && (
          <>
            <p className="text-red-300">Ce lien a expiré ou n’est plus valable. Demande-en un nouveau.</p>
            {form}
          </>
        )}

        {view === "sent" && (
          <p className="rounded-lg border border-white/15 bg-white/5 p-4 text-white/80">
            Si des commandes existent pour <b>{email}</b>, un lien de connexion vient d’être envoyé. Pense à vérifier tes spams.
          </p>
        )}

        {view === "orders" && (
          <>
            <div className="flex items-center justify-between gap-3 text-sm text-white/60">
              <span className="break-all">{email}</span>
              <button onClick={logout} className="shrink-0 underline">Se déconnecter</button>
            </div>
            {orders.length === 0 && <p className="text-white/70">Aucune commande pour cette adresse.</p>}
            {orders.map((o) => {
              const step = SHIP_STEPS.indexOf(o.status);
              const link = trackingUrl(o.carrier, o.tracking);
              return (
                <article key={o.id} className="flex flex-col gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <b>{o.id}</b>
                    <span className="text-sm text-white/60">{day(o.createdAt)}</span>
                  </header>
                  <p className="font-semibold text-[#f2c300]">{SHIP_LABEL[o.status]}</p>
                  {step >= 0 && (
                    <ol className="grid grid-cols-4 gap-1" aria-hidden="true">
                      {SHIP_STEPS.map((s, i) => (
                        <li key={s} className={`h-1.5 rounded-full ${i <= step ? "bg-[#f2c300]" : "bg-white/15"}`} />
                      ))}
                    </ol>
                  )}
                  <ul className="text-sm text-white/80">
                    {o.lines.map((l, i) => (
                      <li key={i}>{l.qty} × {l.name} — {l.color}, {l.size}</li>
                    ))}
                  </ul>
                  <p className="text-sm">Total : <b>{euro(o.total)}</b></p>
                  {o.tracking && (
                    <p className="text-sm text-white/80">
                      {carrierName(o.carrier) || "Transporteur"} · {o.tracking}{" "}
                      {link && <a href={link} target="_blank" rel="noreferrer" className="text-[#f2c300] underline">Suivre le colis</a>}
                    </p>
                  )}
                  {o.message && <p className="text-sm italic text-white/70">{o.message}</p>}
                </article>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
