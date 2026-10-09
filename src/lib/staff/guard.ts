import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "./auth";

/** Second lock behind proxy.ts: every staff handler re-checks the session. */
export async function staffAuthorized(): Promise<boolean> {
  return isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
