import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { orderStatuses } from "@/lib/admin-data";
import { getPostgresPool, inTransaction } from "@/lib/postgres";
import { formatOrderNumber } from "@/lib/order-number";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 16000) return NextResponse.json({ error: "Order is too large." }, { status: 413 });
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
  } catch { return NextResponse.json({ error: "Invalid order." }, { status: 400 }); }
  const field = (name: string, limit: number) => typeof body[name] === "string" && body[name].trim().length <= limit ? body[name].trim() : "";
  const id = field("id", 36);
  const name = field("name", 100);
  const email = field("email", 254);
  const phone = field("phone", 24);
  const date = field("date", 10);
  const address = { address: field("address", 200), address2: "", city: field("city", 100), state: field("state", 100), postalCode: field("postalCode", 20), country: "India" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return NextResponse.json({ error: "Please check the customer details and order items." }, { status: 400 });
  }
  const items = body.items;
  if (!items.every((item) => item && typeof item === "object" && typeof item.productId === "string" && item.productId.length <= 100 && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 10000)) {
    return NextResponse.json({ error: "Please select valid products and quantities." }, { status: 400 });
  }
  try {
    const result = await inTransaction(async (client) => {
      const previous = await client.query("SELECT order_number FROM admin_orders WHERE id=$1", [id]);
      if (previous.rowCount) return { orderNumber: formatOrderNumber(String(previous.rows[0].order_number)), existing: true };
      const productIds = items.map((item) => item.productId as string);
      const productResult = await client.query("SELECT id,name,price,cost FROM admin_products WHERE id=ANY($1::text[]) AND status='Active'", [productIds]);
      const products = new Map(productResult.rows.map((product) => [product.id as string, product]));
      let total = 0;
      let cost = 0;
      const lines: string[] = [];
      for (const item of items) {
        const product = products.get(item.productId);
        if (!product) return null;
        total += Number(product.price) * item.quantity;
        cost += Number(product.cost) * item.quantity;
        lines.push(`${product.name} x ${item.quantity}`);
      }
      const inserted = await client.query("INSERT INTO admin_orders (id,customer_name,email,phone,ordered_on,items,total,cost,status,payment_status,delivery_address) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'New','Awaiting payment',$9::jsonb) ON CONFLICT (id) DO NOTHING RETURNING order_number", [id, name, email, phone, date, JSON.stringify(lines), total, cost, JSON.stringify(address)]);
      if (!inserted.rowCount) {
        const existing = await client.query("SELECT order_number FROM admin_orders WHERE id=$1", [id]);
        return { orderNumber: formatOrderNumber(String(existing.rows[0].order_number)), existing: true };
      }
      return { orderNumber: formatOrderNumber(String(inserted.rows[0].order_number)), existing: false };
    });
    if (!result) return NextResponse.json({ error: "A selected product is no longer active." }, { status: 400 });
    return NextResponse.json({ orderNumber: result.orderNumber }, { status: result.existing ? 200 : 201 });
  } catch (error) {
    console.error("Manual order creation failed", error);
    return NextResponse.json({ error: "Could not create the order. Please check the details and try again." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { id, status, payment } = body as Record<string, unknown>;
  if (typeof id !== "string" || id.length > 100 || (status === undefined && payment === undefined) ||
      (status !== undefined && (typeof status !== "string" || !orderStatuses.includes(status as typeof orderStatuses[number]))) ||
      (payment !== undefined && (typeof payment !== "string" || !["Paid", "Awaiting payment", "Refunded"].includes(payment)))) {
    return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  }
  try {
    const result = await getPostgresPool().query(
      "UPDATE admin_orders SET status=COALESCE($2,status), payment_status=COALESCE($3,payment_status), updated_at=NOW() WHERE id=$1 RETURNING id",
      [id, status ?? null, payment ?? null],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin order update failed", error);
    return NextResponse.json({ error: "Could not update the order." }, { status: 503 });
  }
}