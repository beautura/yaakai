import { NextRequest, NextResponse } from "next/server";
import { adminAuthConfigured, adminCookieName, createAdminSession, isAdminRequest, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: "Admin sign-in is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET on the server." }, { status: 503 });
  }
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 }); }
  if (typeof body.email !== "string" || typeof body.password !== "string" || !verifyAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const session = createAdminSession(body.email);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookieName, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: session.maxAge });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
