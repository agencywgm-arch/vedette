import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** One-off: switches card payments on in the Stripe account's payment method configuration. Removed after use. */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("k") !== "vd-pm-7c2e91") return NextResponse.json({ error: "no" }, { status: 404 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 503 });
  const h = { Authorization: `Bearer ${key}` };
  const mode = key.startsWith("sk_live") || key.startsWith("rk_live") ? "live" : "test";
  const list = await (await fetch("https://api.stripe.com/v1/payment_method_configurations", { headers: h })).json();
  const out: unknown[] = [];
  for (const c of list.data ?? []) {
    const f = new URLSearchParams();
    for (const m of ["card", "link"]) f.set(`${m}[display_preference][preference]`, "on");
    const r = await fetch(`https://api.stripe.com/v1/payment_method_configurations/${c.id}`, { method: "POST", headers: h, body: f });
    const d = await r.json();
    out.push({
      id: c.id, name: c.name, active: c.active, isDefault: c.is_default, status: r.status,
      card: d.card?.available ?? d.error?.message, cardPref: d.card?.display_preference,
    });
  }
  return NextResponse.json({ mode, listError: list.error?.message, configs: out });
}
