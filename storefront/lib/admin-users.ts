import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, stored: string) {
  const [salt, hash, extra] = stored.split(":");
  if (extra || !/^[0-9a-f]{32}$/.test(salt || "") || !/^[0-9a-f]{128}$/.test(hash || "")) return false;
  const candidate = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}