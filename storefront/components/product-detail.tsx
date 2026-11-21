"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatPrice, type Product } from "@/lib/products";

export function ProductDetail({ product }: { product: Product }) {
  const [weight, setWeight] = useState(product.variants[0].weight);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add, ready } = useCart();
  const variant = product.variants.find(item => item.weight === weight) || product.variants[0];
  return <div className="detail-grid"><div className="detail-image"><Image src={product.image} alt={product.imageAlt} fill priority sizes="(max-width: 767px) 100vw, 50vw" /></div><div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="detail-price">{formatPrice(variant.price)}</p><p>{product.description}</p><p className="sample-notice">Photos, price and weight options are illustrative and awaiting confirmation.</p><div className="detail-option"><label htmlFor="detail-weight">Net weight</label><select id="detail-weight" value={weight} onChange={event => { setWeight(event.target.value); setAdded(false); }}>{product.variants.map(item => <option key={item.weight} value={item.weight}>{item.weight}</option>)}</select></div><div className="detail-option"><span>Quantity</span><div className="quantity"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button></div></div><button className="button detail-add" disabled={!ready} onClick={() => { add(product.slug, weight, quantity); setAdded(true); }}>{added ? <><Check size={17} /> Added to Cart</> : "Add to Cart"}</button><div className="ingredient-note"><h2>Ingredients</h2><p>Ingredient information will be added when confirmed by Yaakai.</p></div></div></div>;
}