import { NextResponse } from "next/server";
import type { PublicOrder } from "@/lib/shipping";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, tooMany } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** Customer tracking: an order is only shown to whoever knows both its number
 *  and the e-mail it was placed with. Only shipping facts leave the server —
 *  no address, no staff notes. */
export async function POST(req: Request) {
  if (tooMany(clientIp(req), 10)) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  let body: { id?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const id = clean(body.id, 20).toUpperCase();
  const email = clean(body.email, 200).toLowerCase();
  const db = await loadDb();
  const o = db.orders.find((x) => x.id === id && x.customer.email.toLowerCase() === email);
  if (!o) return NextResponse.json({ error: "Commande introuvable. Vérifie le numéro et l'e-mail." }, { status: 404 });
  const out: PublicOrder = {
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    total: o.total,
    lines: o.lines.map((l) => ({ name: l.name, color: l.color, size: l.size, qty: l.qty })),
    carrier: o.carrier,
    tracking: o.tracking,
    message: o.message,
    history: o.history?.length ? o.history : [{ status: o.status, at: o.createdAt }],
  };
  return NextResponse.json(out);
}
