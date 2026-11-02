import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Passwordless customer accounts: a signed, short-lived link is e-mailed, and opening it
 * starts a signed session cookie. Both are `<base64url(json)>.<hmac>`, with a `kind`
 * inside so a link can never be used as a session. Nothing is stored on the server.
 * Signing key: CUSTOMER_SESSION_SECRET, or STAFF_SESSION_SECRET when that is the only one set.
 */
export const CUSTOMER_COOKIE = "vedette_customer";
export const LINK_TTL_S = 15 * 60;
export const SESSION_TTL_S = 30 * 24 * 3600;

type Kind = "link" | "session";
interface Payload {
  email: string;
  kind: Kind;
  exp: number;
}

const secret = () => process.env.CUSTOMER_SESSION_SECRET ?? process.env.STAFF_SESSION_SECRET ?? null;
export const accountsEnabled = () => secret() !== null;

const sign = (body: string) => createHmac("sha256", secret() as string).update(body).digest("hex");

export function makeToken(email: string, kind: Kind, ttl: number): string {
  const body = Buffer.from(JSON.stringify({ email, kind, exp: Math.floor(Date.now() / 1000) + ttl } satisfies Payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined | null, kind: Kind): string | null {
  if (!token || !secret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(sign(body), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (p.kind !== kind || typeof p.email !== "string" || p.exp < Date.now() / 1000) return null;
    return p.email;
  } catch {
    return null;
  }
}
