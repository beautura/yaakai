import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPostgresPool().query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
