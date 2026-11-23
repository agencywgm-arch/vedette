import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staff/guard";
import { loadSettings, saveSettings } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await staffAuthorized())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await loadSettings());
}

/** { shippingFee: 10 } : delivery fee in euros, 0 to 100, added once per order. */
export async function POST(req: Request) {
  if (!(await staffAuthorized())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  let body: { shippingFee?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const fee = typeof body.shippingFee === "number" ? body.shippingFee : Number(String(body.shippingFee ?? "").replace(",", "."));
  if (!Number.isFinite(fee) || fee < 0 || fee > 100)
    return NextResponse.json({ error: "Les frais de livraison doivent être entre 0 et 100 €" }, { status: 400 });
  const settings = { shippingFee: Math.round(fee * 100) / 100 };
  await saveSettings(settings);
  return NextResponse.json(settings);
}
