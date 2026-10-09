import { NextRequest } from "next/server";
import sharp from "sharp";

export const maxDuration = 60;

const HOST = "https://d8j0ntlcm91z4.cloudfront.net/user_3Guxgt5hk9y4uZQ9EcZTU2JzqFg/";

// ?f=<file>&f=<file>&w=1280&crop=cap — file names are hf_<ts>_<job>.png
export async function GET(req: NextRequest) {
  const files = req.nextUrl.searchParams.getAll("f");
  const w = Number(req.nextUrl.searchParams.get("w") ?? "1280");
  const crop = req.nextUrl.searchParams.get("crop");
  const items = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(HOST + f);
      const buf = Buffer.from(await res.arrayBuffer());
      let img = sharp(buf);
      if (crop === "cap") {
        const meta = await sharp(buf).metadata();
        const W = meta.width ?? 1856;
        const H = meta.height ?? 2304;
        const cw = Math.round(W * 0.56);
        const ch = Math.round(cw * 1.25);
        const left = Math.round((W - cw) / 2);
        const top = Math.round(H * 0.07);
        img = img.extract({ left, top, width: cw, height: Math.min(ch, H - top) });
      }
      const out = await img.resize({ width: w }).webp({ quality: 84 }).toBuffer();
      return out.toString("base64");
    }),
  );
  return Response.json({ items });
}
