/**
 * Staff session, built on Web Crypto only so it runs both in `proxy.ts` and in
 * route handlers. The cookie is `<expiry>.<HMAC-SHA256(expiry)>`, HttpOnly,
 * so the browser can't read it and a forged one fails the signature check.
 *
 * Configure through environment variables (Vercel → Settings → Environment):
 *   STAFF_PASSWORD        the staff password        (default: "admin")
 *   STAFF_SESSION_SECRET  long random string signing the session cookie
 *
 * The defaults exist so the dashboard works on day one. Set both in
 * production: with the defaults, anyone who knows them can sign a session.
 */

export const SESSION_COOKIE = "vedette_staff";
export const SESSION_TTL_S = 60 * 60 * 8; // one shift

const enc = new TextEncoder();

function password(): string {
  return process.env.STAFF_PASSWORD ?? "admin";
}

function secret(): string {
  return process.env.STAFF_SESSION_SECRET ?? "vedette-staff-dev-secret-change-me";
}

async function hmacKey(usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export async function createSession(): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey("sign"), enc.encode(String(expires)));
  return `${expires}.${toHex(sig)}`;
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [expires, sigHex] = token.split(".");
  const exp = Number(expires);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const sig = sigHex ? fromHex(sigHex) : null;
  if (!sig) return false;
  // subtle.verify compares in constant time
  return crypto.subtle.verify("HMAC", await hmacKey("verify"), sig, enc.encode(expires));
}

/** Constant-time password check: compare SHA-256 digests, not the raw strings. */
export async function checkPassword(attempt: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(attempt)),
    crypto.subtle.digest("SHA-256", enc.encode(password())),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Best-effort brute-force brake: 5 misses per IP lock it out for a minute. */
const misses = new Map<string, { n: number; until: number }>();
export function loginLocked(ip: string): number {
  const m = misses.get(ip);
  return m && m.until > Date.now() ? Math.ceil((m.until - Date.now()) / 1000) : 0;
}
export function recordLoginMiss(ip: string) {
  const m = misses.get(ip) ?? { n: 0, until: 0 };
  m.n += 1;
  if (m.n >= 5) {
    m.until = Date.now() + 60_000;
    m.n = 0;
  }
  misses.set(ip, m);
}
export function clearLoginMisses(ip: string) {
  misses.delete(ip);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_S,
};

/** True while the built-in default password or signing secret is in use. */
export function weakConfig(): boolean {
  return !process.env.STAFF_PASSWORD || !process.env.STAFF_SESSION_SECRET;
}
