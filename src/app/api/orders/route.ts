import { NextResponse } from "next/server";
import { collection } from "@/data/collection";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, newId, saveDb, tooMany, validEmail, type Order, type OrderLine } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** Called by the shop once a customer completes their basket. The price is
 *  always read from the catalogue here, never trusted from the browser. */
export async function POST(req: Request) {
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
  if (!name || !validEmail(email))
    return NextResponse.json({ error: "Nom ou e-mail invalide" }, { status: 400 });
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 20)
    return NextResponse.json({ error: "Panier invalide" }, { status: 400 });

  const lines: OrderLine[] = [];
  for (const l of body.lines as Record<string, unknown>[]) {
    const item = collection.find((c) => c.id === l.itemId && !c.locked);
    const size = clean(l.size, 6);
    const color = clean(l.color, 30);
    const qty = Math.min(10, Math.max(1, Math.floor(Number(l.qty ?? 1)) || 1));
    if (!item || !item.sizes.includes(size))
      return NextResponse.json({ error: "Article invalide" }, { status: 400 });
    lines.push({ itemId: item.id, name: item.name, color, size, qty, price: item.price });
  }
  const order: Order = {
    id: newId("CMD"),
    createdAt: new Date().toISOString(),
    customer: { name, email, city: clean(body.customer?.city, 80) },
    lines,
    total: lines.reduce((t, l) => t + l.price * l.qty, 0),
    status: "nouvelle",
    note: "",
  };
  const db = await loadDb();
  db.orders.unshift(order);
  await saveDb(db);
  return NextResponse.json({ ok: true, id: order.id, total: order.total });
}
