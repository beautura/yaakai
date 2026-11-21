import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return new NextResponse(null, { status: 404 });
  try {
    const result = await getPostgresPool().query("SELECT image,content_type,status FROM product_images JOIN admin_products ON admin_products.id=product_images.product_id WHERE product_id=$1", [id]);
    if (!result.rowCount || (result.rows[0].status !== "Active" && !await isAdminRequest(request))) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(result.rows[0].image), { headers: { "Content-Type": result.rows[0].content_type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Product image lookup failed", error);
    return new NextResponse(null, { status: 503 });
  }
}