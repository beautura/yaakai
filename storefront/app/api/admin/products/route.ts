import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { inTransaction } from "@/lib/postgres";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 5_100_000) return NextResponse.json({ error: "Image must be less than 5 MB." }, { status: 413 });
  let form: FormData;
  let product: Record<string, unknown>;
  try {
    form = await request.formData();
    const raw = form.get("product");
    if (typeof raw !== "string" || raw.length > 20000) throw new Error("Invalid product");
    product = JSON.parse(raw);
    if (!product || typeof product !== "object" || Array.isArray(product)) throw new Error("Invalid product");
  } catch { return NextResponse.json({ error: "Invalid product." }, { status: 400 }); }
  const text = (key: string, limit: number) => typeof product[key] === "string" && product[key].trim().length <= limit ? product[key].trim() : "";
  const id = text("id", 100), name = text("name", 100), category = text("category", 100), sku = text("sku", 100);
  const description = text("description", 5000), ingredients = text("ingredients", 5000), imageAlt = text("imageAlt", 200);
  const variants = product.variants;
  const validPrice = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || !name || !category || !sku || typeof product.description !== "string" || product.description.length > 5000 || typeof product.ingredients !== "string" || product.ingredients.length > 5000 || typeof product.imageAlt !== "string" || product.imageAlt.length > 200 || typeof product.featured !== "boolean" || !validPrice(product.cost) || !Number.isInteger(product.stock) || Number(product.stock) < 0 || Number(product.stock) > 2_000_000_000 || !["Active", "Draft"].includes(String(product.status)) || !Array.isArray(variants) || variants.length < 1 || variants.length > 20 || !variants.every((variant) => variant && typeof variant === "object" && typeof variant.weight === "string" && variant.weight.trim().length > 0 && variant.weight.trim().length <= 60 && validPrice(variant.price))) {
    return NextResponse.json({ error: "Please check the product details and prices." }, { status: 400 });
  }
  const normalizedVariants = variants.map((variant) => ({ weight: variant.weight.trim(), price: variant.price as number }));
  if (new Set(normalizedVariants.map((variant) => variant.weight.toLowerCase())).size !== normalizedVariants.length) return NextResponse.json({ error: "Variant weights must be unique." }, { status: 400 });
  const file = form.get("image");
  let image: Buffer | undefined;
  let contentType: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) return NextResponse.json({ error: "Image must be less than 5 MB." }, { status: 400 });
    image = Buffer.from(await file.arrayBuffer());
    const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = image.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const webp = image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
    contentType = png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : undefined;
    if (!contentType) return NextResponse.json({ error: "Use a PNG, JPEG or WebP image." }, { status: 400 });
  }
  try {
    await inTransaction(async (client) => {
      await client.query(`INSERT INTO admin_products (id,name,category,sku,price,cost,finished_stock,status,description,ingredients,image_alt,featured,variants,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,sku=EXCLUDED.sku,price=EXCLUDED.price,cost=EXCLUDED.cost,finished_stock=EXCLUDED.finished_stock,status=EXCLUDED.status,description=EXCLUDED.description,ingredients=EXCLUDED.ingredients,image_alt=EXCLUDED.image_alt,featured=EXCLUDED.featured,variants=EXCLUDED.variants,updated_at=NOW()`, [id, name, category, sku, normalizedVariants[0].price, product.cost, product.stock, product.status, description, ingredients, imageAlt, product.featured, JSON.stringify(normalizedVariants)]);
      if (image && contentType) {
        await client.query("INSERT INTO product_images (product_id,content_type,image) VALUES ($1,$2,$3) ON CONFLICT (product_id) DO UPDATE SET content_type=EXCLUDED.content_type,image=EXCLUDED.image,updated_at=NOW()", [id, contentType, image]);
        await client.query("UPDATE admin_products SET image_path=$2 WHERE id=$1", [id, `/api/products/image?id=${encodeURIComponent(id)}&v=${Date.now()}`]);
      } else if (form.get("removeImage") === "true") {
        await client.query("DELETE FROM product_images WHERE product_id=$1", [id]);
        await client.query("UPDATE admin_products SET image_path='' WHERE id=$1", [id]);
      } else if (typeof product.imagePath === "string" && product.imagePath.startsWith("/images/yaakai/")) {
        await client.query("UPDATE admin_products SET image_path=$2 WHERE id=$1 AND image_path=''", [id, product.imagePath]);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product save failed", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
    return NextResponse.json({ error: "Could not save the product." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let id: unknown;
  try { ({ id } = await request.json() as { id?: unknown }); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  try {
    const result = await inTransaction((client) => client.query("DELETE FROM admin_products WHERE id=$1 RETURNING id", [id]));
    if (!result.rowCount) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product removal failed", error);
    return NextResponse.json({ error: "Could not remove the product." }, { status: 503 });
  }
}