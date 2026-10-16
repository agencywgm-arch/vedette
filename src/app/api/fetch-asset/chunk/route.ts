export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== "vd-tmp-9f3a1c") return new Response("no", { status: 403 });
  const id = u.searchParams.get("u") ?? "";
  const s = Number(u.searchParams.get("s") ?? 0);
  const n = Number(u.searchParams.get("n") ?? 1200000);
  const r = await fetch(`https://d8j0ntlcm91z4.cloudfront.net/${id}`, { headers: { Range: `bytes=${s}-${s + n - 1}` } });
  if (!r.ok && r.status !== 206) return Response.json({ err: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  const total = (r.headers.get("content-range") ?? "").split("/")[1] ?? "";
  return Response.json({ total, got: buf.length, raw: buf.toString("base64") });
}
