"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function HomeSpecialties() {
  const { products, ready, catalogueError } = useCart();
  const featured = products.filter((product) => product.featured).slice(0, 5);
  return <section className="container specialties" aria-labelledby="specialties-title"><h2 className="lined-heading" id="specialties-title">Our Specialities</h2>{catalogueError ? <p className="empty-state" role="alert">{catalogueError}</p> : !ready ? <p className="empty-state">Loading products...</p> : featured.length ? <div className="specialty-grid">{featured.map((product) => <Link className="specialty-card" href={`/products/${product.slug}`} key={product.slug}><span className="specialty-image"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 20vw, 20vw" unoptimized={product.image.startsWith("/api/")} /></span><strong>{product.name}</strong><span className="circle-arrow"><ArrowRight size={15} /></span></Link>)}</div> : <p className="empty-state">No featured products yet.</p>}</section>;
}