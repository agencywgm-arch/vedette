import { NextResponse } from "next/server";
import { collection } from "@/data/collection";
import { staffAuthorized } from "@/lib/staff/guard";
import { loadStock, saveStock } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await staffAuthorized())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ soldOut: await loadStock() });
}

/** Sets the sold-out sizes of one product: { itemId, soldOut: ["M", "L"] } ([] puts it back in stock). */
export async function POST(req: Request) {
  if (!(await staffAuthorized())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  let body: { itemId?: unknown; soldOut?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const item = collection.find((c) => c.id === body.itemId);
  if (!item || !Array.isArray(body.soldOut))
    return NextResponse.json({ error: "Produit ou tailles invalides" }, { status: 400 });
  const sizes = item.sizes.filter((s) => (body.soldOut as unknown[]).includes(s));
  const stock = await loadStock();
  if (sizes.length) stock[item.id] = sizes;
  else delete stock[item.id];
  await saveStock(stock);
  return NextResponse.json({ soldOut: stock });
}
