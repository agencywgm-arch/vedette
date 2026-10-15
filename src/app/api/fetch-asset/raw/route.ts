export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== "vd-tmp-9f3a1c") return new Response("no", { status: 403 });
  const id = u.searchParams.get("u") ?? "";
  const r = await fetch(`https://d8j0ntlcm91z4.cloudfront.net/${id}`);
  if (!r.ok) return Response.json({ err: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  return Response.json({ raw: buf.toString("base64") });
}
