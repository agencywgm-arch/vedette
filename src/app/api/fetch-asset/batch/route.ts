import { NextRequest } from "next/server";
import sharp from "sharp";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const urls = req.nextUrl.searchParams.getAll("u");
  const w = Number(req.nextUrl.searchParams.get("w") ?? "1000");
  const items = await Promise.all(
    urls.map(async (u) => {
      const parsed = new URL(u);
      if (parsed.hostname !== "d8j0ntlcm91z4.cloudfront.net") return null;
      const res = await fetch(parsed.toString());
      const buf = Buffer.from(await res.arrayBuffer());
      const out = await sharp(buf).resize({ width: w }).webp({ quality: 82 }).toBuffer();
      return out.toString("base64");
    }),
  );
  return Response.json({ items });
}
