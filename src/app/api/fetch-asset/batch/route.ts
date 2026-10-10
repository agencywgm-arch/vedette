import sharp from "sharp";

// TEMPORARY: lets the dev sandbox pull Higgsfield outputs. Removed after use.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== "vd-tmp-9f3a1c") return new Response("no", { status: 403 });
  const urls = (u.searchParams.get("u") ?? "").split(",").filter(Boolean).slice(0, 4);
  const ws = (u.searchParams.get("w") ?? "").split(",").map(Number);
  const out: Record<string, string> = {};
  for (const [i, id] of urls.entries()) {
    const r = await fetch(`https://d8j0ntlcm91z4.cloudfront.net/${id}`);
    if (!r.ok) { out[id] = `ERR${r.status}`; continue; }
    const buf = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize({ width: ws[i] || 640, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    out[id] = buf.toString("base64");
  }
  return Response.json(out);
}
