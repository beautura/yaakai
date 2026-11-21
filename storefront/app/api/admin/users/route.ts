import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { hashAdminPassword, normalizeUsername, validUsername } from "@/lib/admin-users";
import { getPostgresPool } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const result = await getPostgresPool().query("SELECT username,created_at FROM admin_users ORDER BY username");
    return NextResponse.json({ users: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load admin users. Check the database setup." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const username = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  if (!validUsername(username) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) {
    return NextResponse.json({ error: "Use a 3-32 character username and a password of 12-128 characters." }, { status: 400 });
  }
  try {
    const hash = await hashAdminPassword(body.password);
    const result = await getPostgresPool().query("INSERT INTO admin_users (username,password_hash) VALUES ($1,$2) ON CONFLICT (username) DO NOTHING RETURNING username", [username, hash]);
    if (!result.rowCount) return NextResponse.json({ error: "That username already exists." }, { status: 409 });
    return NextResponse.json({ username }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not create the user. Check the database setup." }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const username = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  if (!validUsername(username) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return NextResponse.json({ error: "Use a password of 12-128 characters." }, { status: 400 });
  try {
    const hash = await hashAdminPassword(body.password);
    const result = await getPostgresPool().query("UPDATE admin_users SET password_hash=$2 WHERE username=$1 RETURNING username", [username, hash]);
    if (!result.rowCount) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not update the password." }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: { username?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const username = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  if (!validUsername(username)) return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  try {
    const result = await getPostgresPool().query("DELETE FROM admin_users WHERE username=$1 RETURNING username", [username]);
    if (!result.rowCount) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not remove the user." }, { status: 503 }); }
}