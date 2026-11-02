import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE, SESSION_TTL_S, makeToken, readToken } from "@/lib/customer-session";
import { clientIp } from "@/lib/staff/guard";
import { tooMany } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** Trades the e-mailed link for a 30-day session cookie. */
export async function POST(req: Request) {
  if (tooMany(clientIp(req), 20)) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const email = readToken(typeof body.token === "string" ? body.token : "", "link");
  if (!email) return NextResponse.json({ error: "Lien expiré ou invalide. Demande-en un nouveau." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, makeToken(email, "session", SESSION_TTL_S), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  return res;
}
