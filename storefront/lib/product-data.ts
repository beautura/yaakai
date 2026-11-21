import type { AdminProduct } from "@/lib/admin-data";
import { products as starterProducts, type Product } from "@/lib/products";

export const productColumns = "id,name,category,sku,price,cost,finished_stock,status,description,ingredients,image_path,image_alt,featured,variants";

export function mapAdminProduct(row: Record<string, unknown>): AdminProduct {
  const starter = starterProducts.find((product) => product.slug === row.id);
  const savedVariants = Array.isArray(row.variants) ? row.variants.filter((variant): variant is { weight: string; price: number } => Boolean(variant) && typeof variant.weight === "string" && typeof variant.price === "number" && Number.isFinite(variant.price) && variant.price >= 0) : [];
  const legacy = savedVariants.length === 0;
  const variants = legacy ? starter ? starter.variants.map((variant, index) => ({ ...variant, price: index === 0 ? Number(row.price) : variant.price })) : [{ weight: "Standard", price: Number(row.price) }] : savedVariants;
  return {
    id: String(row.id), name: String(row.name), category: String(row.category), sku: String(row.sku), price: Number(row.price), cost: Number(row.cost), stock: Number(row.finished_stock), status: row.status === "Draft" ? "Draft" : "Active",
    description: String(row.description || (legacy ? starter?.description || "" : "")), ingredients: String(row.ingredients || ""), imagePath: String(row.image_path || (legacy ? starter?.image || "" : "")), imageAlt: String(row.image_alt || (legacy ? starter?.imageAlt || "" : "")), featured: legacy && starter ? starter.featured : row.featured === true, variants,
  };
}

export function toPublicProduct(product: AdminProduct): Product {
  return { slug: product.id, name: product.name, category: product.category, description: product.description || "", ingredients: product.ingredients || "", image: product.imagePath || "/images/yaakai/12-whole-spices-and-grains.jpg", imageAlt: product.imageAlt || product.name, featured: product.featured || false, variants: product.variants?.length ? product.variants : [{ weight: "Standard", price: product.price }] };
}