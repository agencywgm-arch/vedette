"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CARRIERS, SHIP_LABEL, carrierName, trackingUrl } from "@/lib/shipping";
import type { Db, Order, ReturnRequest, Ticket } from "@/lib/staff/store";

type Data = Db & { demo: boolean; weak: boolean };
type Tab = "orders" | "returns" | "tickets";

const ORDER_LABEL: Record<string, string> = { ...SHIP_LABEL, nouvelle: "Nouvelle" };
const RETURN_LABEL: Record<string, string> = {
  demandee: "Demandé",
  acceptee: "Accepté",
  recue: "Colis reçu",
  remboursee: "Remboursé",
  refusee: "Refusé",
};
const TICKET_LABEL: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
};
const LABELS: Record<Tab, Record<string, string>> = {
  orders: ORDER_LABEL,
  returns: RETURN_LABEL,
  tickets: TICKET_LABEL,
};

const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function StaffDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [needTracking, setNeedTracking] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/data", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/staff/login");
        return;
      }
      setData((await res.json()) as Data);
      setLoadedAt(Date.now());
      setError("");
    } catch {
      setError("Impossible de charger les données.");
    }
  }, [router]);

  useEffect(() => {
    // initial load + a refresh every minute so new orders show up
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function patch(kind: Tab, id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/staff/items/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) return void router.replace("/staff/login");
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "La modification a échoué.");
    } else setError("");
    await load();
  }

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.replace("/staff/login");
  }

  const kpis = useMemo(() => {
    if (!data) return null;
    const weekAgo = loadedAt - 7 * 86400_000;
    return {
      orders: data.orders.filter((o) => o.status === "nouvelle" || o.status === "preparation").length,
      returns: data.returns.filter((r) => r.status === "demandee" || r.status === "recue").length,
      tickets: data.tickets.filter((t) => t.status !== "resolu").length,
      revenue: data.orders
        .filter((o) => o.status !== "annulee" && new Date(o.createdAt).getTime() > weekAgo)
        .reduce((t, o) => t + o.total, 0),
    };
  }, [data, loadedAt]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!data) return [];
    const hit = (...s: string[]) => !q || s.join(" ").toLowerCase().includes(q);
    if (tab === "orders")
      return data.orders.filter((o) => (!filter || o.status === filter) && hit(o.id, o.customer.name, o.customer.email, o.lines.map((l) => l.name).join(" ")));
    if (tab === "returns")
      return data.returns.filter((r) => (!filter || r.status === filter) && hit(r.id, r.orderId, r.customer.name, r.itemName));
    return data.tickets.filter((t) => (!filter || t.status === filter) && hit(t.id, t.customer.name, t.subject));
  }, [data, tab, filter, q]);

  return (
    <div className="staff-dash">
      <header className="staff-top">
        <div>
          <p className="staff-eyebrow">Vedette</p>
          <h1>Espace staff</h1>
        </div>
        <div className="staff-top-actions">
          <button type="button" onClick={load}>Actualiser</button>
          <button type="button" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      {data?.weak && (
        <p className="staff-demo" role="alert">
          Sécurité : STAFF_PASSWORD et/ou STAFF_SESSION_SECRET ne sont pas définis, le mot de passe
          par défaut est actif. Configure-les dans Vercel → Settings → Environment Variables.
        </p>
      )}
      {data?.demo && (
        <p className="staff-demo">
          Données de démonstration : aucune base n&apos;est connectée, les changements ne sont pas
          conservés durablement. Connecte une base (Upstash / Vercel KV) pour enregistrer les
          vraies commandes.
        </p>
      )}
      {error && <p className="staff-error" role="alert">{error}</p>}

      {kpis && (
        <section className="staff-kpis">
          <Kpi label="Commandes à traiter" value={String(kpis.orders)} />
          <Kpi label="Retours à traiter" value={String(kpis.returns)} />
          <Kpi label="Tickets ouverts" value={String(kpis.tickets)} />
          <Kpi label="Ventes 7 jours" value={euro(kpis.revenue)} />
        </section>
      )}

      <nav className="staff-tabs" aria-label="Sections">
        {(
          [
            ["orders", "Commandes"],
            ["returns", "Retours"],
            ["tickets", "Assistance"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            className={tab === k ? "is-active" : undefined}
            onClick={() => {
              setTab(k);
              setFilter("");
              setOpen(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="staff-tools">
        <input
          type="search"
          placeholder="Rechercher (nom, e-mail, numéro…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {Object.entries(LABELS[tab]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {!data && !error && <p className="staff-empty">Chargement…</p>}
      {data && rows.length === 0 && <p className="staff-empty">Rien à afficher.</p>}

      <ul className="staff-list">
        {tab === "orders" &&
          (rows as Order[]).map((o) => (
            <Row
              key={o.id}
              id={o.id}
              open={open === o.id}
              onToggle={() => setOpen(open === o.id ? null : o.id)}
              title={`${o.id} · ${o.customer.name}`}
              sub={`${when(o.createdAt)} · ${o.lines.map((l) => `${l.name} (${l.size})`).join(", ")}`}
              right={euro(o.total)}
              status={o.status}
              statuses={ORDER_LABEL}
              onStatus={(s) => {
                // Shipping needs a parcel number: ask for it instead of silently saving.
                if (s === "expediee" && !o.tracking) {
                  setOpen(o.id);
                  setNeedTracking(o.id);
                  return;
                }
                setNeedTracking(null);
                patch("orders", o.id, { status: s });
              }}
            >
              <p>{o.customer.email}{o.customer.city ? ` · ${o.customer.city}` : ""}</p>
              <ul className="staff-lines">
                {o.lines.map((l, i) => (
                  <li key={i}>{l.qty} × {l.name} — {l.color}, {l.size} — {euro(l.price * l.qty)}</li>
                ))}
              </ul>
              <Shipping
                order={o}
                needTracking={needTracking === o.id}
                onSave={(body) => {
                  if (body.status === "expediee") setNeedTracking(null);
                  patch("orders", o.id, body);
                }}
              />
              <Note value={o.note} onSave={(note) => patch("orders", o.id, { note })} />
            </Row>
          ))}
        {tab === "returns" &&
          (rows as ReturnRequest[]).map((r) => (
            <Row
              key={r.id}
              id={r.id}
              open={open === r.id}
              onToggle={() => setOpen(open === r.id ? null : r.id)}
              title={`${r.id} · ${r.customer.name}`}
              sub={`${when(r.createdAt)} · ${r.itemName} · commande ${r.orderId}`}
              status={r.status}
              statuses={RETURN_LABEL}
              onStatus={(s) => patch("returns", r.id, { status: s })}
            >
              <p>{r.customer.email}</p>
              <p className="staff-quote">« {r.reason} »</p>
              <Note value={r.note} onSave={(note) => patch("returns", r.id, { note })} />
            </Row>
          ))}
        {tab === "tickets" &&
          (rows as Ticket[]).map((t) => (
            <Row
              key={t.id}
              id={t.id}
              open={open === t.id}
              onToggle={() => setOpen(open === t.id ? null : t.id)}
              title={`${t.id} · ${t.subject}`}
              sub={`${when(t.createdAt)} · ${t.customer.name} · ${t.channel}`}
              status={t.status}
              statuses={TICKET_LABEL}
              onStatus={(s) => patch("tickets", t.id, { status: s })}
            >
              <p>{t.customer.email}</p>
              <ul className="staff-thread">
                {t.messages.map((m, i) => (
                  <li key={i} className={m.from === "staff" ? "is-staff" : undefined}>
                    <span>{m.from === "staff" ? "Staff" : t.customer.name} · {when(m.at)}</span>
                    {m.text}
                  </li>
                ))}
              </ul>
              <Reply onSend={(reply) => patch("tickets", t.id, { reply })} />
              <Note value={t.note} onSave={(note) => patch("tickets", t.id, { note })} />
            </Row>
          ))}
      </ul>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="staff-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Row({
  id,
  open,
  onToggle,
  title,
  sub,
  right,
  status,
  statuses,
  onStatus,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  title: string;
  sub: string;
  right?: string;
  status: string;
  statuses: Record<string, string>;
  onStatus: (s: string) => void;
  children: React.ReactNode;
}) {
  return (
    <li className={`staff-row ${open ? "is-open" : ""}`} data-id={id}>
      <div className="staff-row-head">
        <button type="button" className="staff-row-main" onClick={onToggle} aria-expanded={open}>
          <strong>{title}</strong>
          <span>{sub}</span>
        </button>
        {right && <span className="staff-row-amount">{right}</span>}
        <select
          className={`staff-status is-${status}`}
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          aria-label="Statut"
        >
          {Object.entries(statuses).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {open && <div className="staff-row-body">{children}</div>}
    </li>
  );
}

function Shipping({ order, onSave, needTracking }: { order: Order; onSave: (b: Record<string, unknown>) => void; needTracking: boolean }) {
  const [carrier, setCarrier] = useState(order.carrier ?? "colissimo");
  const [tracking, setTracking] = useState(order.tracking ?? "");
  const [message, setMessage] = useState(order.message ?? "");
  const url = trackingUrl(carrier, tracking.trim());
  const history = order.history ?? [];
  const markShipped = order.status !== "expediee" && order.status !== "livree";
  return (
    <div className={`staff-ship ${needTracking ? "is-needed" : ""}`}>
      <label>Expédition</label>
      {needTracking && (
        <p className="staff-ship-alert" role="alert">
          Saisis le numéro de colis puis clique sur « Marquer expédiée » : le client pourra suivre son colis.
        </p>
      )}
      <div className="staff-ship-row">
        <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label="Transporteur">
          {CARRIERS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          autoFocus={needTracking}
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="N° de colis / de suivi"
          maxLength={40}
          aria-label="Numéro de suivi"
        />
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message affiché au client (ex. livraison en point relais)"
        maxLength={300}
        aria-label="Message au client"
      />
      <div className="staff-ship-actions">
        <button type="button" onClick={() => onSave({ carrier, tracking, message })}>
          Enregistrer
        </button>
        {markShipped && order.status !== "annulee" && (
          <button
            type="button"
            className="is-primary"
            disabled={!tracking.trim()}
            title={tracking.trim() ? "" : "Renseigne le numéro de suivi"}
            onClick={() => onSave({ carrier, tracking, message, status: "expediee" })}
          >
            Marquer expédiée
          </button>
        )}
        {order.status === "expediee" && (
          <button type="button" className="is-primary" onClick={() => onSave({ status: "livree" })}>
            Marquer livrée
          </button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Ouvrir le suivi {carrierName(carrier)} →
          </a>
        )}
      </div>
      {history.length > 0 && (
        <ol className="staff-ship-history">
          {history.map((h, i) => (
            <li key={i}>
              <strong>{ORDER_LABEL[h.status] ?? h.status}</strong> · {when(h.at)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Note({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="staff-note">
      <label>Note interne</label>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={2} maxLength={1000} />
      <button type="button" onClick={() => onSave(v)} disabled={v === value}>
        Enregistrer la note
      </button>
    </div>
  );
}

function Reply({ onSend }: { onSend: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="staff-note">
      <label>Répondre au client</label>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} maxLength={2000} />
      <button
        type="button"
        onClick={() => {
          onSend(v);
          setV("");
        }}
        disabled={!v.trim()}
      >
        Envoyer la réponse
      </button>
    </div>
  );
}
