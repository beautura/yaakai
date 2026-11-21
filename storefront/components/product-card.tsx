"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatPrice, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const [weight, setWeight] = useState(product.variants[0].weight);
  const [added, setAdded] = useState(false);
  const { add, ready } = useCart();
  const variant = product.variants.find(item => item.weight === weight) || product.variants[0];
  return <article className="product-card"><Link className="product-photo" href={`/products/${product.slug}`}><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw" /></Link><div className="product-card-body"><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><p>{product.description}</p><strong className="product-price">{formatPrice(variant.price)}</strong><label className="weight-label">Weight <select value={weight} onChange={event => { setWeight(event.target.value); setAdded(false); }} aria-label={`Weight for ${product.name}`}>{product.variants.map(item => <option key={item.weight} value={item.weight}>{item.weight}</option>)}</select></label><button className="button card-add" type="button" aria-label={`Add ${product.name} to bag`} disabled={!ready} onClick={() => { add(product.slug, weight); setAdded(true); }}>{added ? <><Check size={15} /> Added to Cart</> : "Add to Cart"}</button><Link className="details-link" href={`/products/${product.slug}`}>Product details <ArrowRight size={13} /></Link></div></article>;
}