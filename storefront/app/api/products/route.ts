import { NextResponse } from "next/server";
import { getPublicProducts } from "@/lib/public-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ products: await getPublicProducts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Product catalogue unavailable", error);
    return NextResponse.json({ error: "Products are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}