import { NextResponse } from "next/server";
import { loadStock } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** What the shop needs to grey out: sizes that are out of stock, per product. No quantities, no auth. */
export async function GET() {
  try {
    return NextResponse.json({ soldOut: await loadStock() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // the shop must keep selling if the stock list is briefly unreachable
    return NextResponse.json({ soldOut: {} });
  }
}
