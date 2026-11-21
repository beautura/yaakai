"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ExternalLink, Menu, MessageCircle, Phone, Search, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { contactAddress, contactPhone, contactWhatsApp } from "@/lib/site-info";

const Facebook = ExternalLink;
const Instagram = ExternalLink;
const links = [{ href: "/#home", label: "Home" }, { href: "/products", label: "Products" }, { href: "/#about", label: "About" }, { href: "/#contact", label: "Contact" }];

export function Logo({ light = false }: { light?: boolean }) {
  return <Link className={`logo${light ? " logo-light" : ""}`} href="/#home" aria-label="Yaakai home"><span className="logo-mark" aria-hidden="true" /></Link>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();
  return <header className="site-header"><div className="header-inner"><Logo /><nav className="desktop-nav" aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><div className="header-actions"><Link className="icon-button" href="/products#catalogue" aria-label="Search products" title="Search products"><Search /></Link><Link className="icon-button cart-link" href="/cart" aria-label={`Shopping cart, ${ready ? count : 0} items`} title="Shopping cart"><ShoppingCart /><span>{ready ? count : 0}</span></Link><Link className="button button-small header-shop" href="/products">Shop Now</Link><button className="icon-button mobile-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div><nav id="mobile-menu" className={`mobile-nav${open ? " open" : ""}`} aria-label="Mobile navigation" hidden={!open}>{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowRight size={16} /></Link>)}</nav></header>;
}

export function WhatsAppFloating() {
  const whatsapp = contactWhatsApp.replace(/\D/g, "");
  return <a className="whatsapp-float" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp Yaakai" title="WhatsApp Yaakai"><span className="whatsapp-float-icon" aria-hidden="true"><MessageCircle /><Phone className="whatsapp-phone" /></span></a>;
}

export function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const phone = contactPhone;
  const address = contactAddress;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const facebook = process.env.NEXT_PUBLIC_FACEBOOK_URL;
  return <footer className="site-footer"><div className="container footer-grid"><div><Logo light /><p>Traditional Tamil flavours, thoughtfully brought to your everyday table.</p>{(instagram || facebook) && <div className="social-links">{instagram && <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>}{facebook && <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>}</div>}</div><div><h3>Quick Links</h3>{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div><div><h3>Customer Care</h3><Link href="/cart">Your Cart</Link><Link href="/checkout">Checkout</Link><Link href="/#contact">Contact Us</Link><span>Shipping information coming soon</span></div><div><h3>Get in Touch</h3><span className="footer-address">{address}</span>{phone && <a href={`tel:${phone}`}>{phone}</a>}{email ? <a href={`mailto:${email}`}>{email}</a> : <Link href="/#contact">Email contact details coming soon</Link>}<h3 className="newsletter-title">Stay in Touch</h3><p>Newsletter subscriptions coming soon.</p><div className="newsletter"><input type="email" aria-label="Email for newsletter" placeholder="Your email address" disabled /><button type="button" aria-label="Subscribe to newsletter" disabled><ArrowRight size={17} /></button></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Yaakai. All rights reserved.</span><span>Made with care in Tamil Nadu</span></div></footer>;
}