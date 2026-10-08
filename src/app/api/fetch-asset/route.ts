import { NextRequest } from "next/server";

const ALLOWED_HOSTS = [
  "d8j0ntlcm91z4.cloudfront.net",
  "d2ol7oe51mr4n9.cloudfront.net",
  "drive.google.com",
  "drive.usercontent.google.com",
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

  const range = req.nextUrl.searchParams.get("range");
  const headers: HeadersInit = range ? { Range: `bytes=${range}` } : {};

  const res = await fetch(parsed.toString(), { headers, redirect: "follow" });
  if (!res.ok && res.status !== 206) {
    return new Response("upstream error", { status: 502 });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return Response.json({
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    contentRange: res.headers.get("content-range"),
    totalLength: res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length"),
    finalUrl: res.url,
    base64: buf.toString("base64"),
  });
}
