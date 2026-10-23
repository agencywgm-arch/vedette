import { NextResponse } from "next/server";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, newId, saveDb, tooMany, validEmail, type Order } from "@/lib/staff/store";
import { buildLines, createCheckoutSession, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Starts a Stripe Checkout payment. Prices come from the catalogue, never from the browser. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  if (tooMany(clientIp(req))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 20_000)
    return NextResponse.json({ error: "Requête trop grande" }, { status: 413 });
  let body: { customer?: Record<string, unknown>; lines?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const name = clean(body.customer?.name, 80);
  const email = clean(body.customer?.email, 200);
  if (!name || !validEmail(email)) return NextResponse.json({ error: "Nom ou e-mail invalide" }, { status: 400 });
  const lines = buildLines(body.lines);
  if (!lines) return NextResponse.json({ error: "Panier invalide" }, { status: 400 });

  const order: Order = {
    id: newId("CMD"),
    createdAt: new Date().toISOString(),
    customer: { name, email, city: clean(body.customer?.city, 80) },
    lines: lines.map((l) => ({ ...l, qty: 1 })),
    total: lines.reduce((t, l) => t + l.price, 0),
    status: "nouvelle",
    paid: false,
    note: "En attente du paiement Stripe",
    history: [{ status: "nouvelle", at: new Date().toISOString() }],
  };
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const session = await createCheckoutSession({ orderId: order.id, email, name, lines, origin });
    order.stripeSession = session.id;
    const db = await loadDb();
    db.orders.unshift(order);
    await saveDb(db);
    return NextResponse.json({ ok: true, id: order.id, url: session.url });
  } catch {
    return NextResponse.json({ error: "Le paiement n'a pas pu démarrer. Réessaie dans un instant." }, { status: 502 });
  }
}
