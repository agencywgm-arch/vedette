import { NextResponse } from "next/server";
import { accountsEnabled, LINK_TTL_S, makeToken } from "@/lib/customer-session";
import { mailConfigured, mailMagicLink } from "@/lib/email";
import { clientIp } from "@/lib/staff/guard";
import { clean, loadDb, tooMany, validEmail } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** Sends a sign-in link. The answer is identical whether or not the e-mail has orders,
 *  so the form can't be used to find out who is a customer. */
export async function POST(req: Request) {
  if (!accountsEnabled() || !mailConfigured())
    return NextResponse.json({ error: "La connexion par e-mail n'est pas encore disponible." }, { status: 503 });
  if (tooMany(clientIp(req), 5)) return NextResponse.json({ error: "Trop de demandes, réessaie dans une minute." }, { status: 429 });
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const email = clean(body.email, 200).toLowerCase();
  if (!validEmail(email)) return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
  // at most 2 links a minute per address, so nobody can be flooded with mail
  if (!tooMany(`link:${email}`, 2)) {
    const db = await loadDb();
    const has = db.orders.some((o) => o.customer.email.toLowerCase() === email && (o.paid || !o.stripeSession));
    if (has) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
      await mailMagicLink(email, `${site}/compte?t=${makeToken(email, "link", LINK_TTL_S)}`);
    }
  }
  return NextResponse.json({ ok: true });
}
