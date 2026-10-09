import { NextResponse } from "next/server";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, newId, saveDb, tooMany, validEmail, type Ticket } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** A customer writes to support; it lands as a ticket in the dashboard. */
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
  const subject = clean(b.subject, 140);
  const message = clean(b.message, 2000);
  if (!name || !validEmail(email) || !subject || !message)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  const now = new Date().toISOString();
  const t: Ticket = {
    id: newId("SAV"), createdAt: now, customer: { name, email }, subject,
    channel: "chat", status: "ouvert", note: "",
    messages: [{ from: "client", at: now, text: message }],
  };
  const db = await loadDb();
  db.tickets.unshift(t);
  await saveDb(db);
  return NextResponse.json({ ok: true, id: t.id });
}
