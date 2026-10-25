import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE, readToken } from "@/lib/customer-session";
import type { PublicOrder } from "@/lib/shipping";
import { loadDb } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** The signed-in customer's own orders. Same facts as the public tracking: no address, no staff notes. */
export async function GET() {
  const email = readToken((await cookies()).get(CUSTOMER_COOKIE)?.value, "session");
  if (!email) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const db = await loadDb();
  const orders: PublicOrder[] = db.orders
    .filter((o) => o.customer.email.toLowerCase() === email && (o.paid || !o.stripeSession))
    .map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      lines: o.lines.map((l) => ({ name: l.name, color: l.color, size: l.size, qty: l.qty })),
      carrier: o.carrier,
      tracking: o.tracking,
      message: o.message,
      history: o.history?.length ? o.history : [{ status: o.status, at: o.createdAt }],
    }));
  return NextResponse.json({ email, orders });
}
