import { NextResponse } from "next/server";
import { weakConfig } from "@/lib/staff/auth";
import { staffAuthorized } from "@/lib/staff/guard";
import { isPersistent, loadDb } from "@/lib/staff/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await staffAuthorized())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const db = await loadDb();
  return NextResponse.json({ ...db, demo: !isPersistent(), weak: weakConfig() });
}
