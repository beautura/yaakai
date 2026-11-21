import { NextRequest, NextResponse } from "next/server";
import type { AdminData, AdminOrder, AdminProduct, Expense, InventoryItem, StoreSettings } from "@/lib/admin-data";
import { isAdminRequest } from "@/lib/admin-auth";
import { contactAddress, contactPhone } from "@/lib/site-info";
import { getPostgresPool, inTransaction } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultSettings: StoreSettings = { storeName: "Yaakai", address: contactAddress, phone: contactPhone, lowStockThreshold: 8, taxRate: 0, currency: "INR" };
const unauthorized = () => NextResponse.json({ error: "Admin sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
const serverError = () => NextResponse.json({ error: "Admin database unavailable. Check DATABASE_URL and run npm run db:setup." }, { status: 503, headers: { "Cache-Control": "no-store" } });

function mapProduct(row: Record<string, unknown>): AdminProduct {
  return { id: String(row.id), name: String(row.name), category: String(row.category), sku: String(row.sku), price: Number(row.price), cost: Number(row.cost), stock: Number(row.finished_stock), status: row.status === "Draft" ? "Draft" : "Active" };
}
function mapOrder(row: Record<string, unknown>): AdminOrder {
  return { id: String(row.id), customer: String(row.customer_name), email: String(row.email), phone: String(row.phone), date: String(row.ordered_on).slice(0, 10), items: Array.isArray(row.items) ? row.items.map(String) : [], total: Number(row.total), cost: Number(row.cost), status: String(row.status) as AdminOrder["status"], payment: String(row.payment_status) as AdminOrder["payment"] };
}
function mapInventory(row: Record<string, unknown>): InventoryItem {
  return { id: String(row.id), name: String(row.name), sku: String(row.sku), type: row.item_type === "Store stock" ? "Store stock" : "Raw material", unit: String(row.unit), onHand: Number(row.on_hand), reorderLevel: Number(row.reorder_level), costPerUnit: Number(row.cost_per_unit), supplier: String(row.supplier) };
}
function mapExpense(row: Record<string, unknown>): Expense {
  return { id: String(row.id), title: String(row.title), category: String(row.category), amount: Number(row.amount), date: String(row.spent_on).slice(0, 10), note: String(row.note) };
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isValidData(value: unknown): value is AdminData {
  if (!isRecord(value) || !Array.isArray(value.products) || !Array.isArray(value.orders) || !Array.isArray(value.inventory) || !Array.isArray(value.expenses) || !isRecord(value.settings)) return false;
  const validNonNegative = (number: unknown) => typeof number === "number" && Number.isFinite(number) && number >= 0;
  return value.products.every(item => isRecord(item) && typeof item.id === "string" && typeof item.name === "string" && typeof item.category === "string" && typeof item.sku === "string" && validNonNegative(item.price) && validNonNegative(item.cost) && Number.isInteger(item.stock) && validNonNegative(item.stock) && ["Active", "Draft"].includes(String(item.status)))
  && value.orders.every(item => isRecord(item) && typeof item.id === "string" && typeof item.customer === "string" && typeof item.email === "string" && typeof item.phone === "string" && typeof item.date === "string" && Array.isArray(item.items) && validNonNegative(item.total) && validNonNegative(item.cost) && ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"].includes(String(item.status)) && ["Paid", "Awaiting payment", "Refunded"].includes(String(item.payment)))
  && value.inventory.every(item => isRecord(item) && typeof item.id === "string" && typeof item.name === "string" && typeof item.sku === "string" && ["Raw material", "Store stock"].includes(String(item.type)) && typeof item.unit === "string" && validNonNegative(item.onHand) && validNonNegative(item.reorderLevel) && validNonNegative(item.costPerUnit) && typeof item.supplier === "string")
  && value.expenses.every(item => isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.category === "string" && validNonNegative(item.amount) && typeof item.date === "string" && typeof item.note === "string")
  && typeof value.settings.storeName === "string" && typeof value.settings.address === "string" && typeof value.settings.phone === "string" && Number.isInteger(value.settings.lowStockThreshold) && validNonNegative(value.settings.lowStockThreshold) && validNonNegative(value.settings.taxRate);
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const pool = getPostgresPool();
    const [products, orders, inventory, expenses, settings] = await Promise.all([
      pool.query("SELECT id,name,category,sku,price,cost,finished_stock,status FROM admin_products ORDER BY name"),
      pool.query("SELECT id,customer_name,email,phone,ordered_on,items,total,cost,status,payment_status FROM admin_orders ORDER BY ordered_on DESC,id DESC"),
      pool.query("SELECT id,name,sku,item_type,unit,on_hand,reorder_level,cost_per_unit,supplier FROM admin_inventory ORDER BY item_type,name"),
      pool.query("SELECT id,title,category,amount,spent_on,note FROM admin_expenses ORDER BY spent_on DESC,created_at DESC"),
      pool.query("SELECT store_name,address,phone,low_stock_threshold,tax_rate,currency FROM admin_settings WHERE id=1"),
    ]);
    const stored = settings.rows[0];
    const data: AdminData = {
      products: products.rows.map(mapProduct),
      orders: orders.rows.map(mapOrder),
      inventory: inventory.rows.map(mapInventory),
      expenses: expenses.rows.map(mapExpense),
      settings: stored ? { storeName: String(stored.store_name), address: String(stored.address), phone: String(stored.phone), lowStockThreshold: Number(stored.low_stock_threshold), taxRate: Number(stored.tax_rate), currency: "INR" } : defaultSettings,
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin data GET failed", error);
    return serverError();
  }
}
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  let data: unknown;
  try { data = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!isValidData(data)) return NextResponse.json({ error: "Admin data failed validation." }, { status: 400 });
  try {
    await inTransaction(async client => {
      for (const product of data.products) await client.query(`INSERT INTO admin_products (id,name,category,sku,price,cost,finished_stock,status,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,sku=EXCLUDED.sku,price=EXCLUDED.price,cost=EXCLUDED.cost,finished_stock=EXCLUDED.finished_stock,status=EXCLUDED.status,updated_at=NOW()`, [product.id, product.name, product.category, product.sku, product.price, product.cost, product.stock, product.status]);
      for (const order of data.orders) await client.query(`INSERT INTO admin_orders (id,customer_name,email,phone,ordered_on,items,total,cost,status,payment_status,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,NOW()) ON CONFLICT (id) DO UPDATE SET customer_name=EXCLUDED.customer_name,email=EXCLUDED.email,phone=EXCLUDED.phone,ordered_on=EXCLUDED.ordered_on,items=EXCLUDED.items,total=EXCLUDED.total,cost=EXCLUDED.cost,status=EXCLUDED.status,payment_status=EXCLUDED.payment_status,updated_at=NOW()`, [order.id, order.customer, order.email, order.phone, order.date, JSON.stringify(order.items), order.total, order.cost, order.status, order.payment]);
      for (const item of data.inventory) await client.query(`INSERT INTO admin_inventory (id,name,sku,item_type,unit,on_hand,reorder_level,cost_per_unit,supplier,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,sku=EXCLUDED.sku,item_type=EXCLUDED.item_type,unit=EXCLUDED.unit,on_hand=EXCLUDED.on_hand,reorder_level=EXCLUDED.reorder_level,cost_per_unit=EXCLUDED.cost_per_unit,supplier=EXCLUDED.supplier,updated_at=NOW()`, [item.id, item.name, item.sku, item.type, item.unit, item.onHand, item.reorderLevel, item.costPerUnit, item.supplier]);
      for (const expense of data.expenses) await client.query(`INSERT INTO admin_expenses (id,title,category,amount,spent_on,note) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,amount=EXCLUDED.amount,spent_on=EXCLUDED.spent_on,note=EXCLUDED.note`, [expense.id, expense.title, expense.category, expense.amount, expense.date, expense.note]);
      await client.query("INSERT INTO admin_settings (id,store_name,address,phone,low_stock_threshold,tax_rate,currency) VALUES (1,$1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET store_name=EXCLUDED.store_name,address=EXCLUDED.address,phone=EXCLUDED.phone,low_stock_threshold=EXCLUDED.low_stock_threshold,tax_rate=EXCLUDED.tax_rate,currency=EXCLUDED.currency", [data.settings.storeName, data.settings.address, data.settings.phone, data.settings.lowStockThreshold, data.settings.taxRate, data.settings.currency]);
      await client.query("DELETE FROM admin_products WHERE NOT (id = ANY($1::text[]))", [data.products.map(item => item.id)]);
      await client.query("DELETE FROM admin_orders WHERE NOT (id = ANY($1::text[]))", [data.orders.map(item => item.id)]);
      await client.query("DELETE FROM admin_inventory WHERE NOT (id = ANY($1::text[]))", [data.inventory.map(item => item.id)]);
      await client.query("DELETE FROM admin_expenses WHERE NOT (id = ANY($1::text[]))", [data.expenses.map(item => item.id)]);
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin data PUT failed", error);
    if (isRecord(error) && error.code === "23505") return NextResponse.json({ error: "A product or inventory SKU must be unique." }, { status: 409 });
    return serverError();
  }
}
