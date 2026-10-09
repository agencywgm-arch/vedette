import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  checkPassword,
  clearLoginMisses,
  createSession,
  loginLocked,
  recordLoginMiss,
  sessionCookieOptions,
} from "@/lib/staff/auth";
import { clientIp } from "@/lib/staff/guard";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const wait = loginLocked(ip);
  if (wait) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${wait} s.` },
      { status: 429 },
    );
  }
  let pw = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    pw = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  } catch {
    /* empty body → wrong password */
  }
  if (!(await checkPassword(pw))) {
    recordLoginMiss(ip);
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  clearLoginMisses(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(), sessionCookieOptions);
  return res;
}
