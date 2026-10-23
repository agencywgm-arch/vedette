import { createHmac, timingSafeEqual } from "node:crypto";
import { collection } from "@/data/collection";
import { clean } from "@/lib/staff/store";

/** Minimal Stripe REST client: one call to create a Checkout Session, no SDK. */
const API = "https://api.stripe.com/v1";

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export interface CheckoutLine {
  itemId: string;
  name: string;
  color: string;
  size: string;
  price: number;
}

/** The catalogue is the only source of prices: the browser sends item ids only. */
export function buildLines(raw: unknown): CheckoutLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) return null;
  const lines: CheckoutLine[] = [];
  for (const l of raw as Record<string, unknown>[]) {
    const item = collection.find((c) => c.id === l.itemId && !c.locked);
    const size = clean(l.size, 6);
    const color = clean(l.color, 30);
    if (!item || !item.sizes.includes(size)) return null;
    lines.push({ itemId: item.id, name: item.name, color, size, price: item.price });
  }
  return lines;
}

export async function createCheckoutSession(opts: {
  orderId: string;
  email: string;
  name: string;
  lines: CheckoutLine[];
  origin: string;
}): Promise<{ id: string; url: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured");
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("locale", "fr");
  f.set("customer_email", opts.email);
  f.set("client_reference_id", opts.orderId);
  f.set("success_url", `${opts.origin}/?paid=${encodeURIComponent(opts.orderId)}`);
  f.set("cancel_url", `${opts.origin}/?checkout=cancelled`);
  f.set("billing_address_collection", "auto");
  f.set("phone_number_collection[enabled]", "true");
  ["FR", "BE", "LU", "CH", "DE", "ES", "IT", "NL", "PT", "GB"].forEach((c, i) =>
    f.set(`shipping_address_collection[allowed_countries][${i}]`, c),
  );
  opts.lines.forEach((l, i) => {
    f.set(`line_items[${i}][quantity]`, "1");
    f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(l.price * 100)));
    f.set(`line_items[${i}][price_data][product_data][name]`, l.name);
    f.set(`line_items[${i}][price_data][product_data][description]`, `${l.color} · ${l.size}`);
  });
  f.set("metadata[orderId]", opts.orderId);
  f.set("metadata[customerName]", opts.name);
  // enough to rebuild the order from the webhook if the order list was lost
  f.set("metadata[lines]", opts.lines.map((l) => `${l.itemId}|${l.size}|${l.color}`).join(";").slice(0, 480));
  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: f,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.id || !data.url) throw new Error(data.error?.message ?? "stripe_error");
  return { id: data.id, url: data.url };
}

/** Checks the `Stripe-Signature` header (HMAC-SHA256, 5 minute tolerance). */
export function verifyWebhook(payload: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  // a header can carry several v1 signatures (key rotation); header.split keeps only the last, so scan them all
  const all = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return all.some((sig) => {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
