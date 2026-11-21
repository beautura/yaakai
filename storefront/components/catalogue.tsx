"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";

const categories = ["All Products", "Thokku", "Honey & nuts", "Health mixes", "Masala"];

export function Catalogue() {
  const [category, setCategory] = useState("All Products");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [limit, setLimit] = useState(4);
  const filtered = products.filter(product => (category === "All Products" || product.category === category) && `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())).sort((first, second) => sort === "low" ? first.variants[0].price - second.variants[0].price : sort === "high" ? second.variants[0].price - first.variants[0].price : Number(second.featured) - Number(first.featured));
  return <div id="catalogue" className="container catalogue"><div className="catalogue-heading"><div><p className="eyebrow">A TASTE OF TRADITION</p><h2>Our traditional favourites</h2></div><p>Thoughtful recipes for your everyday table.</p></div><p className="sample-notice">Product photos, prices, weights and descriptions are illustrative and awaiting confirmation.</p><div className="catalogue-tools"><div className="filter-list" aria-label="Product categories">{categories.map(item => <button key={item} className={category === item ? "filter active" : "filter"} aria-pressed={category === item} onClick={() => { setCategory(item); setLimit(4); }}>{item}</button>)}</div><div className="catalogue-controls"><label className="search-field"><Search size={17} /><input value={search} onChange={event => { setSearch(event.target.value); setLimit(4); }} type="search" placeholder="Search products" aria-label="Search products" /></label><label className="sort-field"><span>Sort by</span><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div></div>{filtered.length ? <><div className="product-grid">{filtered.slice(0, limit).map(product => <ProductCard key={product.slug} product={product} />)}</div>{limit < filtered.length && <div className="center-action"><button className="button outline-button" onClick={() => setLimit(current => current + 4)}>Load More</button></div>}</> : <p className="empty-state">No products found. Try a different search or category.</p>}</div>;
}