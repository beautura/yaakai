import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getPostgresPool().query("SELECT image,content_type FROM admin_payment_qr WHERE id=1");
    if (!result.rowCount) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(result.rows[0].image), { headers: { "Content-Type": result.rows[0].content_type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Payment QR lookup failed", error);
    return new NextResponse(null, { status: 503 });
  }
}