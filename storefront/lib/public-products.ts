import { getPostgresPool } from "@/lib/postgres";
import { mapAdminProduct, productColumns, toPublicProduct } from "@/lib/product-data";

export async function getPublicProducts() {
  const result = await getPostgresPool().query(`SELECT ${productColumns} FROM admin_products WHERE status='Active' ORDER BY name`);
  return result.rows.map((row) => toPublicProduct(mapAdminProduct(row)));
}