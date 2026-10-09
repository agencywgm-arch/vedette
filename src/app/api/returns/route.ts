import { NextResponse } from "next/server";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, newId, saveDb, tooMany, validEmail, type ReturnRequest } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** A customer asks to send a piece back; staff then handle it in the dashboard. */
export async function POST(req: Request) {
  if (tooMany(clientIp(req))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 10_000)
    return NextResponse.json({ error: "Requête trop grande" }, { status: 413 });
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const name = clean(b.name, 80);
  const email = clean(b.email, 200);
  const orderId = clean(b.orderId, 20);
  const itemName = clean(b.itemName, 120);
  const reason = clean(b.reason, 1000);
  if (!name || !validEmail(email) || !orderId || !itemName || !reason)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  const r: ReturnRequest = {
    id: newId("RET"),
    createdAt: new Date().toISOString(),
    orderId, customer: { name, email }, itemName, reason,
    status: "demandee", note: "",
  };
  const db = await loadDb();
  db.returns.unshift(r);
  await saveDb(db);
  return NextResponse.json({ ok: true, id: r.id });
}
