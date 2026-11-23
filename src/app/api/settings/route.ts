import { NextResponse } from "next/server";
import { DEFAULT_SETTINGS, loadSettings } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

/** What the shop shows before payment (the delivery fee). Public, read-only. */
export async function GET() {
  try {
    return NextResponse.json(await loadSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
