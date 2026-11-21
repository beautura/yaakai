"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/products";

type CartItem = { slug: string; weight: string; quantity: number };
type CartContextValue = { items: CartItem[]; products: Product[]; ready: boolean; catalogueError: string | null; unavailableCount: number; removeUnavailable: () => void; add: (slug: string, weight: string, quantity?: number) => void; update: (slug: string, weight: string, quantity: number) => void; clear: () => void; count: number; subtotal: number };
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "yaakai-next-cart-v1";
type CartSnapshot = { items: CartItem[]; ready: boolean };
const serverSnapshot: CartSnapshot = { items: [], ready: false };
let snapshot: CartSnapshot = serverSnapshot;
const listeners = new Set<() => void>();

function readItems(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved.filter((item): item is CartItem => typeof item?.slug === "string" && typeof item?.weight === "string" && Number.isInteger(item?.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}

function notify() { listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.ready) { snapshot = { items: readItems(), ready: true }; }
  function onStorage(event: StorageEvent) { if (event.key === storageKey) { snapshot = { items: readItems(), ready: true }; notify(); } }
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
function saveItems(items: CartItem[]) {
  snapshot = { items, ready: true };
  try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
  notify();
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, ready: cartReady } = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  const [catalogue, setCatalogue] = useState<{ products: Product[]; ready: boolean; error: string | null }>({ products: [], ready: false, error: null });
  useEffect(() => {
    let active = true;
    function loadCatalogue() {
      fetch("/api/products", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Products are temporarily unavailable.");
        return response.json() as Promise<{ products: Product[] }>;
      }).then((data) => {
        if (active) setCatalogue({ products: data.products, ready: true, error: null });
      }).catch(() => {
        if (active) setCatalogue({ products: [], ready: true, error: "Products are temporarily unavailable." });
      });
    }
    loadCatalogue();
    window.addEventListener("focus", loadCatalogue);
    window.addEventListener("yaakai:products-changed", loadCatalogue);
    return () => { active = false; window.removeEventListener("focus", loadCatalogue); window.removeEventListener("yaakai:products-changed", loadCatalogue); };
  }, []);
  const products = catalogue.products;
  const ready = cartReady && catalogue.ready && !catalogue.error;
  const available = (item: CartItem) => products.some((product) => product.slug === item.slug && product.variants.some((variant) => variant.weight === item.weight));

  function add(slug: string, weight: string, quantity = 1) {
    if (!ready) return;
    if (!products.some(product => product.slug === slug && product.variants.some(variant => variant.weight === weight)) || !Number.isInteger(quantity) || quantity < 1) return;
    const current = snapshot.items;
    const existing = current.find(item => item.slug === slug && item.weight === weight);
    saveItems(existing ? current.map(item => item === existing ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { slug, weight, quantity }]);
  }

  function update(slug: string, weight: string, quantity: number) {
    if (!Number.isInteger(quantity)) return;
    saveItems(snapshot.items.flatMap(item => item.slug === slug && item.weight === weight ? quantity > 0 ? [{ ...item, quantity }] : [] : [item]));
  }

  const count = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + (products.find(product => product.slug === item.slug)?.variants.find(variant => variant.weight === item.weight)?.price || 0) * item.quantity, 0);
  const unavailableCount = ready ? items.filter((item) => !available(item)).length : 0;
  return <CartContext.Provider value={{ items, products, ready, catalogueError: catalogue.error, unavailableCount, removeUnavailable: () => { if (ready) saveItems(snapshot.items.filter(available)); }, add, update, clear: () => saveItems([]), count, subtotal }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}