import { NextResponse } from "next/server";
import { collection } from "@/data/collection";
import { loadDb, saveDb, type Order } from "@/lib/staff/store";
import { verifyWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";

interface Session {
  id: string;
  client_reference_id?: string;
  payment_status?: string;
  customer_details?: { email?: string; name?: string; phone?: string; address?: Record<string, string | null> };
  shipping_details?: { name?: string; address?: Record<string, string | null> };
  metadata?: Record<string, string>;
  amount_total?: number;
}

const addr = (a?: Record<string, string | null>) =>
  a ? [a.line1, a.line2, a.postal_code, a.city, a.country].filter(Boolean).join(", ") : "";

/** Stripe calls this once a payment succeeds: marks the order paid (or rebuilds it if it was lost). */
export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature")))
    return NextResponse.json({ error: "signature" }, { status: 400 });
  let event: { type?: string; data?: { object?: Session } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "json" }, { status: 400 });
  }
  const s = event.data?.object;
  if (event.type !== "checkout.session.completed" || !s || s.payment_status !== "paid")
    return NextResponse.json({ ok: true, ignored: true });

  const id = s.client_reference_id ?? s.metadata?.orderId;
  if (!id) return NextResponse.json({ ok: true, ignored: true });
  const shipping = addr(s.shipping_details?.address ?? s.customer_details?.address);
  const db = await loadDb();
  let order = db.orders.find((o) => o.id === id);
  if (!order) {
    const lines = (s.metadata?.lines ?? "").split(";").flatMap((raw) => {
      const [itemId, size, color] = raw.split("|");
      const item = collection.find((c) => c.id === itemId);
      return item ? [{ itemId: item.id, name: item.name, color: color ?? "", size: size ?? "", qty: 1, price: item.price }] : [];
    });
    order = {
      id,
      createdAt: new Date().toISOString(),
      customer: { name: s.customer_details?.name ?? s.metadata?.customerName ?? "", email: s.customer_details?.email ?? "" },
      lines,
      total: (s.amount_total ?? 0) / 100,
      status: "nouvelle",
      note: "",
      history: [{ status: "nouvelle", at: new Date().toISOString() }],
    } satisfies Order;
    db.orders.unshift(order);
  }
  order.paid = true;
  order.stripeSession = s.id;
  if (shipping) order.shippingAddress = shipping;
  order.note = [`Payé via Stripe (${s.id})`, s.customer_details?.phone ? `Tél. ${s.customer_details.phone}` : ""].filter(Boolean).join(" · ");
  await saveDb(db);
  return NextResponse.json({ ok: true });
}
