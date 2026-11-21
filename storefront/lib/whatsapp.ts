import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { BufferJSON, DisconnectReason, initAuthCreds, makeWASocket, proto, type AuthenticationState, type SignalDataTypeMap, type WASocket } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { getPostgresPool } from "@/lib/postgres";

type WhatsAppRuntime = { socket?: WASocket; starting?: Promise<void>; status: "disconnected" | "connecting" | "connected" | "pairing"; qr?: string; draining: boolean; stopped: boolean; deliveryTimer?: ReturnType<typeof setInterval> };

declare global {
  var yaakaiWhatsApp: WhatsAppRuntime | undefined;
}

const runtime = globalThis.yaakaiWhatsApp ??= { status: "disconnected", draining: false, stopped: false };

function encryptionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("WhatsApp session encryption is not configured.");
  return createHash("sha256").update(`yaakai-whatsapp:${secret}`).digest();
}

function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value, BufferJSON.replacer), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

function decrypt(value: string) {
  const bytes = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"), BufferJSON.reviver);
}

async function load(key: string) {
  const result = await getPostgresPool().query("SELECT value FROM whatsapp_auth WHERE key=$1", [key]);
  return result.rows[0] ? decrypt(result.rows[0].value) : null;
}

async function save(key: string, value: unknown) {
  if (value == null) await getPostgresPool().query("DELETE FROM whatsapp_auth WHERE key=$1", [key]);
  else await getPostgresPool().query("INSERT INTO whatsapp_auth (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [key, encrypt(value)]);
}

async function authState(): Promise<AuthenticationState> {
  const creds = await load("creds") || initAuthCreds();
  return {
    creds,
    keys: {
      async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]) {
        const values: Record<string, SignalDataTypeMap[T]> = {};
        for (const id of ids) {
          let value = await load(`${type}:${id}`);
          if (value && type === "app-state-sync-key") value = proto.Message.AppStateSyncKeyData.fromObject(value);
          if (value) values[id] = value as SignalDataTypeMap[T];
        }
        return values;
      },
      async set(data) {
        for (const [type, values] of Object.entries(data)) {
          for (const [id, value] of Object.entries(values || {})) await save(`${type}:${id}`, value);
        }
      },
    },
  };
}

async function drain() {
  if (runtime.draining || runtime.status !== "connected" || !runtime.socket) return;
  runtime.draining = true;
  try {
    const pending = await getPostgresPool().query("SELECT order_id,phone,message FROM whatsapp_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 50");
    for (const row of pending.rows) {
      if (runtime.status !== "connected" || !runtime.socket) break;
      try {
        await runtime.socket.sendMessage(`${row.phone}@s.whatsapp.net`, { text: row.message });
        await getPostgresPool().query("UPDATE whatsapp_outbox SET sent_at=NOW() WHERE order_id=$1 AND sent_at IS NULL", [row.order_id]);
      } catch { console.error("WhatsApp confirmation could not be sent; it remains queued."); }
    }
  } catch (error) {
    console.error("WhatsApp message delivery failed", error instanceof Error ? error.message : "Unknown error");
  } finally {
    runtime.draining = false;
  }
}

export async function connectWhatsApp(allowPairing = false) {
  if (runtime.starting) return runtime.starting;
  if (runtime.socket) return;
  runtime.starting = (async () => {
    if (!allowPairing && !await load("creds")) return;
    runtime.stopped = false;
    runtime.status = "connecting";
    const auth = await authState();
    const socket = makeWASocket({ auth, markOnlineOnConnect: false, syncFullHistory: false });
    runtime.socket = socket;
    socket.ev.on("creds.update", () => { void save("creds", auth.creds).catch(() => { console.error("Could not save WhatsApp session."); }); });
    socket.ev.on("connection.update", (update) => {
      if (runtime.socket !== socket) return;
      if (update.qr) { runtime.qr = update.qr; runtime.status = "pairing"; }
      if (update.connection === "open") {
        runtime.status = "connected";
        runtime.qr = undefined;
        void drain();
        if (runtime.deliveryTimer) clearInterval(runtime.deliveryTimer);
        runtime.deliveryTimer = setInterval(() => { void drain(); }, 60000);
      }
      if (update.connection === "close") {
        if (runtime.deliveryTimer) clearInterval(runtime.deliveryTimer);
        runtime.deliveryTimer = undefined;
        runtime.socket = undefined;
        runtime.qr = undefined;
        runtime.status = "disconnected";
        const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        if (!runtime.stopped && code !== DisconnectReason.loggedOut) setTimeout(() => { void connectWhatsApp(true).catch(() => { console.error("Could not reconnect WhatsApp."); }); }, 5000);
      }
    });
  })().catch((error) => { runtime.status = "disconnected"; throw error; }).finally(() => { runtime.starting = undefined; });
  return runtime.starting;
}

export async function whatsappStatus() {
  return { status: runtime.status, qr: runtime.qr ? await QRCode.toDataURL(runtime.qr, { margin: 2, width: 256 }) : null };
}

export async function disconnectWhatsApp() {
  runtime.stopped = true;
  if (runtime.deliveryTimer) clearInterval(runtime.deliveryTimer);
  runtime.deliveryTimer = undefined;
  const socket = runtime.socket;
  runtime.socket = undefined;
  runtime.status = "disconnected";
  runtime.qr = undefined;
  if (socket) {
    try { await socket.logout(); } catch { socket.end(undefined); }
  }
  await getPostgresPool().query("DELETE FROM whatsapp_auth");
}

export async function wakeWhatsApp() {
  await connectWhatsApp();
  await drain();
}