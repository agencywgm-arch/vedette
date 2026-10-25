import { NextResponse } from "next/server";
import { mailOrderStatus, mailTicketReply } from "@/lib/email";
import { CARRIERS } from "@/lib/shipping";
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
  let body: { status?: unknown; note?: unknown; reply?: unknown; carrier?: unknown; tracking?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const db = await loadDb();
  let mail: Promise<unknown> | null = null;
  const status = typeof body.status === "string" ? body.status : undefined;
  const note = body.note === undefined ? undefined : clean(body.note, 1000);

  if (kind === "orders") {
    const it = db.orders.find((x) => x.id === id);
    if (!it) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (status) {
      if (!(ORDER_STATUSES as string[]).includes(status))
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      // An order can't be marked shipped without a parcel number the customer can follow.
      const incoming = body.tracking === undefined ? it.tracking : clean(body.tracking, 40);
      if (status === "expediee" && !incoming)
        return NextResponse.json({ error: "Numéro de colis requis pour passer en « Expédiée »" }, { status: 400 });
      if (it.status !== status) {
        const notify = status === "expediee" || status === "livree" || status === "annulee";
        it.status = status as typeof it.status;
        if (notify) mail = Promise.resolve().then(() => mailOrderStatus(it));
        (it.history ??= [{ status: "nouvelle", at: it.createdAt }]).push({ status: it.status, at: new Date().toISOString() });
      }
    }
    if (note !== undefined) it.note = note;
    if (body.carrier !== undefined) {
      const c = clean(body.carrier, 20);
      if (c && !CARRIERS.some((x) => x.id === c))
        return NextResponse.json({ error: "Transporteur inconnu" }, { status: 400 });
      it.carrier = c || undefined;
    }
    if (body.tracking !== undefined) it.tracking = clean(body.tracking, 40).replace(/\s+/g, "") || undefined;
    if (body.message !== undefined) it.message = clean(body.message, 300) || undefined;
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
      mail = mailTicketReply(it, reply);
    }
  } else {
    return NextResponse.json({ error: "Type inconnu" }, { status: 404 });
  }
  await saveDb(db);
  if (mail) await mail;
  return NextResponse.json({ ok: true });
}
