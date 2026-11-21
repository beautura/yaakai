import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const adminCookieName = "yaakai_admin_session";
const sessionLifetimeSeconds = 8 * 60 * 60;

type SessionPayload = { email: string; expiresAt: number };

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && (process.env.ADMIN_SESSION_SECRET?.length || 0) >= 32);
}

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  return Boolean(expectedEmail && expectedPassword && safeEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase()) && safeEqual(password, expectedPassword));
}

export function createAdminSession(email: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  const payload: SessionPayload = { email: email.trim().toLowerCase(), expiresAt: Date.now() + sessionLifetimeSeconds * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encoded}.${sign(encoded, secret)}`, maxAge: sessionLifetimeSeconds };
}

export function isAdminRequest(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const token = request.cookies.get(adminCookieName)?.value;
  if (!secret || secret.length < 32 || !token) return false;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  if (!safeEqual(suppliedSignature, sign(encoded, secret))) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return typeof payload.email === "string" && Number.isFinite(payload.expiresAt) && payload.expiresAt > Date.now();
  } catch { return false; }
}
