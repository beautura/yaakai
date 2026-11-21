import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before initializing the Yaakai database.");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  const inventory = [
    ["raw-curry-leaves", "Fresh curry leaves", "RAW-001", "Raw material", "kg", 0, 0, 0, ""],
    ["raw-groundnuts", "Groundnuts", "RAW-002", "Raw material", "kg", 0, 0, 0, ""],
    ["raw-sesame-oil", "Cold-pressed sesame oil", "RAW-003", "Raw material", "L", 0, 0, 0, ""],
    ["raw-millet-blend", "Health mix grains", "RAW-004", "Raw material", "kg", 0, 0, 0, ""],
    ["raw-turmeric", "Turmeric powder", "RAW-005", "Raw material", "kg", 0, 0, 0, ""],
    ["store-jars", "Glass jars", "SUP-001", "Store stock", "pcs", 0, 0, 0, ""],
    ["store-pouches", "Stand-up pouches", "SUP-002", "Store stock", "pcs", 0, 0, 0, ""],
  ];
  for (const [id, name, sku, type, unit, onHand, reorderLevel, cost, supplier] of inventory) {
    await pool.query("INSERT INTO admin_inventory (id,name,sku,item_type,unit,on_hand,reorder_level,cost_per_unit,supplier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING", [id, name, sku, type, unit, onHand, reorderLevel, cost, supplier]);
  }
  await pool.query("INSERT INTO admin_settings (id,store_name,address,phone,low_stock_threshold,tax_rate,currency) VALUES (1,$1,$2,$3,8,0,'INR') ON CONFLICT (id) DO NOTHING", [process.env.NEXT_PUBLIC_STORE_NAME || "Yaakai", process.env.NEXT_PUBLIC_CONTACT_ADDRESS || "226, Gandhi Road, T.R.Pattinam, Karaikal, Puducherry. 609606.", process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 8098874435"]);
  console.log("Yaakai PostgreSQL schema and initial catalogue/inventory are ready. No sample orders or expenses were added.");
} finally {
  await pool.end();
}
