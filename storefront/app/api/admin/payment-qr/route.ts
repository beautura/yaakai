import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 1_100_000) return NextResponse.json({ error: "Image must be less than 1 MB." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000) return NextResponse.json({ error: "Choose an image smaller than 1 MB." }, { status: 400 });
    const image = Buffer.from(await file.arrayBuffer());
    const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = image.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const webp = image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
    const contentType = png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : null;
    if (!contentType) return NextResponse.json({ error: "Use a PNG, JPEG or WebP image." }, { status: 400 });
    await getPostgresPool().query("INSERT INTO admin_payment_qr (id,content_type,image) VALUES (1,$1,$2) ON CONFLICT (id) DO UPDATE SET content_type=EXCLUDED.content_type,image=EXCLUDED.image,updated_at=NOW()", [contentType, image]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Payment QR update failed", error);
    return NextResponse.json({ error: "Could not save the payment QR." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    await getPostgresPool().query("DELETE FROM admin_payment_qr WHERE id=1");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Payment QR removal failed", error);
    return NextResponse.json({ error: "Could not remove the payment QR." }, { status: 503 });
  }
}