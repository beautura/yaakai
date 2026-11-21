import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { products } from "@/lib/products";

export function generateStaticParams() { return products.map(product => ({ slug: product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const product = products.find(item => item.slug === slug); return { title: product?.name || "Product", description: product?.description }; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find(item => item.slug === slug);
  if (!product) notFound();
  const related = products.filter(item => item.slug !== slug).slice(0, 4);
  return <main className="container product-detail-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span>{product.name}</div><ProductDetail product={product} /><section className="related"><h2 className="lined-heading">You May Also Like</h2><div className="product-grid">{related.map(item => <ProductCard key={item.slug} product={item} />)}</div></section></main>;
}