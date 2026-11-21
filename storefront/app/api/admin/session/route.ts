import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { adminAuthConfigured, adminCookieName, createAdminSession, isAdminRequest, verifyAdminCredentials } from "@/lib/admin-auth";
import { getPostgresPool } from "@/lib/postgres";
import { normalizeUsername, verifyAdminPassword } from "@/lib/admin-users";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; expiresAt: number }>();

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: await isAdminRequest(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: "Admin sign-in is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET on the server." }, { status: 503 });
  }
  let body: { username?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 }); }
  const identity = typeof body.username === "string" ? body.username : body.email;
  if (typeof identity !== "string" || typeof body.password !== "string" || identity.length > 254 || body.password.length > 128) {
    return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
  }
  const normalized = normalizeUsername(identity);
  const current = attempts.get(normalized);
  if (current && current.expiresAt > Date.now() && current.count >= 8) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  let kind: "bootstrap" | "user" = "bootstrap";
  let version: string | undefined;
  let valid = verifyAdminCredentials(normalized, body.password);
  if (!valid && !normalized.includes("@")) {
    try {
      const result = await getPostgresPool().query("SELECT password_hash FROM admin_users WHERE username=$1", [normalized]);
      const user = result.rows[0];
      valid = await verifyAdminPassword(body.password, user?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`);
      if (valid && user) { kind = "user"; version = createHash("sha256").update(user.password_hash).digest("hex"); }
    } catch (error) {
      console.error("Admin user sign-in failed", error);
      return NextResponse.json({ error: "Admin sign-in is unavailable. Check the database setup." }, { status: 503 });
    }
  }
  if (!valid) {
    if (attempts.size >= 1000) attempts.delete(attempts.keys().next().value!);
    attempts.set(normalized, { count: current && current.expiresAt > Date.now() ? current.count + 1 : 1, expiresAt: current && current.expiresAt > Date.now() ? current.expiresAt : Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
  }
  attempts.delete(normalized);
  const session = createAdminSession(normalized, kind, version);
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
