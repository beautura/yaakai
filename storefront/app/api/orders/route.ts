import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { inTransaction } from "@/lib/postgres";
import { contactPhone } from "@/lib/site-info";
import { wakeWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 16000) return NextResponse.json({ error: "Order is too large." }, { status: 413 });
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
  } catch { return NextResponse.json({ error: "Invalid order." }, { status: 400 }); }

  const field = (name: string, max: number) => typeof body[name] === "string" && body[name].trim().length <= max ? body[name].trim() : "";
  const id = field("id", 36);
  const name = field("name", 100);
  const email = field("email", 254);
  const rawPhone = field("phone", 24);
  const digits = rawPhone.replace(/[^0-9]/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const address = { address: field("address", 200), address2: field("address2", 200), city: field("city", 100), state: field("state", 100), postalCode: field("postalCode", 20), country: field("country", 80) };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^91[6-9]\d{9}$/.test(phone) || !address.address || !address.city || !address.state || !/^\d{6}$/.test(address.postalCode) || address.country.toLowerCase() !== "india" || body.whatsappConsent !== true || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return NextResponse.json({ error: "Please check your details, Indian phone number and PIN code." }, { status: 400 });
  }

  const lines: string[] = [];
  let total = 0;
  for (const item of body.items) {
    if (!item || typeof item !== "object" || typeof item.slug !== "string" || typeof item.weight !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
    const product = products.find((entry) => entry.slug === item.slug);
    const variant = product?.variants.find((entry) => entry.weight === item.weight);
    if (!product || !variant) return NextResponse.json({ error: "A product in your cart is no longer available." }, { status: 400 });
    total += variant.price * item.quantity;
    lines.push(`${product.name} (${variant.weight}) x ${item.quantity}`);
  }
  try {
    let storePhone = contactPhone;
    const result = await inTransaction(async (client) => {
      const settings = await client.query("SELECT phone FROM admin_settings WHERE id=1");
      storePhone = settings.rows[0]?.phone || contactPhone;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [phone]);
      const existing = await client.query("SELECT phone,total FROM admin_orders WHERE id=$1", [id]);
      if (existing.rowCount) {
        if (existing.rows[0].phone !== phone) return "conflict";
        total = Number(existing.rows[0].total);
        return "existing";
      }
      const recent = await client.query("SELECT COUNT(*)::int AS count FROM admin_orders WHERE phone=$1 AND created_at > NOW() - INTERVAL '10 minutes'", [phone]);
      if (recent.rows[0].count >= 3) return "limited";
      await client.query("INSERT INTO admin_orders (id,customer_name,email,phone,ordered_on,items,total,cost,status,payment_status,delivery_address) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5::jsonb,$6,0,'New','Awaiting payment',$7::jsonb)", [id, name, email, phone, JSON.stringify(lines), total, JSON.stringify(address)]);
      const message = `Thank you for choosing Yaakai!\n\nOrder confirmation: ${id}\n${lines.join("\n")}\nTotal: INR ${total}\nPayment: awaiting payment\n\nFor payment details, please contact ${storePhone}. Delivery charges will be confirmed by the store.`;
      await client.query("INSERT INTO whatsapp_outbox (order_id,phone,message) VALUES ($1,$2,$3)", [id, phone, message]);
      return "created";
    });
    if (result === "conflict") return NextResponse.json({ error: "Order could not be submitted. Please refresh and try again." }, { status: 409 });
    if (result === "limited") return NextResponse.json({ error: "Too many orders from this number. Please try again later." }, { status: 429 });
    void wakeWhatsApp().catch(() => { console.error("Could not start WhatsApp delivery."); });
    return NextResponse.json({ id, total, contactPhone: storePhone, status: "Awaiting payment" }, { status: result === "created" ? 201 : 200 });
  } catch (error) {
    console.error("Order creation failed", error);
    return NextResponse.json({ error: "We could not place your order. Please try again." }, { status: 503 });
  }
}