"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/products";
import { indiaStates } from "@/lib/india-states";

export function CheckoutPage() {
  const { items, products, subtotal, ready, clear, catalogueError, unavailableCount } = useCart();
  const orderId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ orderNumber: string; total: number; contactPhone: string } | null>(null);
  const [hasQr, setHasQr] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready || unavailableCount) return;
    setBusy(true);
    setError("");
    orderId.current ??= crypto.randomUUID();
    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, id: orderId.current, items: items.map((item) => ({ ...item, expectedPrice: products.find((product) => product.slug === item.slug)?.variants.find((variant) => variant.weight === item.weight)?.price })), whatsappConsent: form.has("whatsappConsent") }),
      });
      const result = await response.json() as { orderNumber?: string; total?: number; contactPhone?: string; error?: string };
      if (!response.ok || !result.orderNumber || typeof result.total !== "number") throw new Error(result.error || "Could not place your order.");
      setOrder({ orderNumber: result.orderNumber, total: result.total, contactPhone: result.contactPhone || "" });
      clear();
      fetch("/api/payment-qr", { cache: "no-store" }).then((qr) => setHasQr(qr.ok)).catch(() => setHasQr(false));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not place your order.");
    } finally {
      setBusy(false);
    }
  }

  if (order) return <main className="container commerce-page"><p className="eyebrow">ORDER RECEIVED</p><h1>Thank you for choosing Yaakai</h1><p>Your order <strong>{order.orderNumber}</strong> has been received. Payment of {formatPrice(order.total)} is pending.</p>{hasQr && <div className="payment-qr"><Image src="/api/payment-qr" alt="Payment QR code" width={220} height={220} unoptimized /><p>Scan to pay, then contact us to confirm your payment.</p></div>}<p>For payment details, contact {order.contactPhone}. WhatsApp confirmation is sent when messaging is available.</p><Link className="button" href="/products">Continue shopping</Link></main>;

  return (
    <main className="container commerce-page">
      <p className="eyebrow">YOUR YAAKAI SELECTION</p>
      <h1>Checkout</h1>
      {catalogueError ? <p role="alert">{catalogueError}</p> : !ready ? <p>Loading your cart...</p> : items.length === 0 ? <div className="empty-cart"><h2>Your cart is empty.</h2><Link className="button" href="/products">Explore Products</Link></div> : (
        <div className="commerce-grid checkout-grid">
          <form className="checkout-form" onSubmit={submit}>
            <h2>Customer Details</h2>
            <div className="form-grid">
              <label>Full name<input name="name" autoComplete="name" maxLength={100} required /></label>
              <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
              <label>WhatsApp number<input name="phone" type="tel" autoComplete="tel" placeholder="10-digit Indian number" maxLength={24} required /></label>
            </div>
            <h2>Shipping Address</h2>
            <div className="form-grid">
              <label className="form-wide">Address<input name="address" autoComplete="address-line1" maxLength={200} required /></label>
              <label className="form-wide">Apartment, suite, etc. <span>(optional)</span><input name="address2" autoComplete="address-line2" maxLength={200} /></label>
              <label>City<input name="city" autoComplete="address-level2" maxLength={100} required /></label>
              <label>State or union territory<select name="state" autoComplete="address-level1" defaultValue="" required><option value="" disabled>Select a state</option>{indiaStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
              <label>PIN code<input name="postalCode" inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" required /></label>
              <label>Country<input name="country" value="India" readOnly /></label>
            </div>
            <label className="checkout-consent"><input name="whatsappConsent" type="checkbox" required /> I agree to receive this order confirmation on WhatsApp.</label>
            <p className="checkout-message">Payment is not collected at checkout. Contact the store for payment and delivery details.</p>
            {unavailableCount > 0 && <p className="checkout-error" role="alert">Some products are no longer available. <Link href="/cart">Update your cart</Link> before ordering.</p>}
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="button full-button" type="submit" disabled={busy || unavailableCount > 0}>{busy ? "Placing order..." : "Place order"}</button>
          </form>
          <aside className="order-summary"><h2>Order Summary</h2>{items.map((item) => { const product = products.find((entry) => entry.slug === item.slug); const variant = product?.variants.find((entry) => entry.weight === item.weight); if (!product || !variant) return null; return <div className="summary-line" key={`${item.slug}-${item.weight}`}><span>{product.name}<small>{item.weight} x {item.quantity}</small></span><strong>{formatPrice(variant.price * item.quantity)}</strong></div>; })}<div className="summary-line summary-total"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><p>Delivery charges will be confirmed by the store.</p><Link className="continue-link" href="/cart">Return to cart</Link></aside>
        </div>
      )}
    </main>
  );
}