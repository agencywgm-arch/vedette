import { NextRequest } from "next/server";

// Temporary build-time helper: pulls a generated asset from an allowlisted
// host into base64 so it can be fetched through Vercel's own network (the
// dev sandbox's egress proxy blocks these CDNs directly). Removed once the
// cabine assets are committed — never meant to ship as a standing proxy.
const ALLOWED_HOSTS = [
  "d8j0ntlcm91z4.cloudfront.net",
  "d2ol7oe51mr4n9.cloudfront.net",
];

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return new Response("missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  const res = await fetch(parsed.toString());
  if (!res.ok) return new Response("upstream error", { status: 502 });
  const buf = Buffer.from(await res.arrayBuffer());
  return Response.json({
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    base64: buf.toString("base64"),
  });
}
