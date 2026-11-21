import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { orderStatuses } from "@/lib/admin-data";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { id, status, payment } = body as Record<string, unknown>;
  if (typeof id !== "string" || id.length > 100 || (status === undefined && payment === undefined) ||
      (status !== undefined && (typeof status !== "string" || !orderStatuses.includes(status as typeof orderStatuses[number]))) ||
      (payment !== undefined && (typeof payment !== "string" || !["Paid", "Awaiting payment", "Refunded"].includes(payment)))) {
    return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  }
  try {
    const result = await getPostgresPool().query(
      "UPDATE admin_orders SET status=COALESCE($2,status), payment_status=COALESCE($3,payment_status), updated_at=NOW() WHERE id=$1 RETURNING id",
      [id, status ?? null, payment ?? null],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin order update failed", error);
    return NextResponse.json({ error: "Could not update the order." }, { status: 503 });
  }
}