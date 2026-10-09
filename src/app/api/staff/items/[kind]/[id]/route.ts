import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staff/guard";
import {
  ORDER_STATUSES,
  RETURN_STATUSES,
  TICKET_STATUSES,
  clean,
  loadDb,
  saveDb,
} from "@/lib/staff/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ kind: string; id: string }> },
) {
  if (!(await staffAuthorized())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { kind, id } = await ctx.params;
  let body: { status?: unknown; note?: unknown; reply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const db = await loadDb();
  const status = typeof body.status === "string" ? body.status : undefined;
  const note = body.note === undefined ? undefined : clean(body.note, 1000);

  if (kind === "orders") {
    const it = db.orders.find((x) => x.id === id);
    if (!it) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (status) {
      if (!(ORDER_STATUSES as string[]).includes(status))
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      it.status = status as typeof it.status;
    }
    if (note !== undefined) it.note = note;
  } else if (kind === "returns") {
    const it = db.returns.find((x) => x.id === id);
    if (!it) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (status) {
      if (!(RETURN_STATUSES as string[]).includes(status))
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      it.status = status as typeof it.status;
    }
    if (note !== undefined) it.note = note;
  } else if (kind === "tickets") {
    const it = db.tickets.find((x) => x.id === id);
    if (!it) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (status) {
      if (!(TICKET_STATUSES as string[]).includes(status))
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      it.status = status as typeof it.status;
    }
    if (note !== undefined) it.note = note;
    const reply = clean(body.reply, 2000);
    if (reply) {
      it.messages.push({ from: "staff", at: new Date().toISOString(), text: reply });
      if (it.status === "ouvert") it.status = "en_cours";
    }
  } else {
    return NextResponse.json({ error: "Type inconnu" }, { status: 404 });
  }
  await saveDb(db);
  return NextResponse.json({ ok: true });
}
