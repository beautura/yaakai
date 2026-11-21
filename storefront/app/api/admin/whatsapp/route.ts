import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { connectWhatsApp, disconnectWhatsApp, whatsappStatus } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try { return NextResponse.json(await whatsappStatus(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "WhatsApp status is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    await connectWhatsApp(true);
    return NextResponse.json(await whatsappStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("WhatsApp connection failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not connect WhatsApp. Check the database setup and server logs." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    await disconnectWhatsApp();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not disconnect WhatsApp." }, { status: 503 });
  }
}