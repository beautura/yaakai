import { CookingPot, ExternalLink, Heart, Leaf, Mail, MapPin, MessageCircle, Phone, Sprout } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { contactAddress, contactPhone, contactWhatsApp } from "@/lib/site-info";

const FacebookIcon = ExternalLink;
const InstagramIcon = ExternalLink;

export function HomeAboutSection() {
  return <section id="about" className="home-about"><div className="section-banner banner-about"><div className="container"><h2>About Yaakai</h2><p>Our Story <span>•</span> Our Purpose</p></div></div><div className="container about-intro"><div><p className="eyebrow">OUR STORY</p><h2>Rooted in Tradition,<br />Committed to Health</h2><p>Yaakai is inspired by the traditional Tamil foods that bring families together. We believe the flavours and recipes we grew up with deserve a place at the modern table.</p><p>Our philosophy is simple: honour familiar recipes, choose ingredients thoughtfully, and make everyday food feel like home.</p><Link className="button" href="/products">Explore Our Products</Link></div><div className="about-photo" role="img" aria-label="Traditional mortar and pestle with fresh curry leaves" /></div><div className="mission-band"><div className="container mission-grid"><div><p className="eyebrow">OUR MISSION</p><h2>Tradition on every table</h2><p>To share the comforting flavours of Tamil food traditions in a way that fits into everyday life.</p></div><div><p className="eyebrow">OUR VISION</p><h2>Goodness, passed on</h2><p>To keep the spirit of our food heritage close, connecting generations through recipes and care.</p></div></div></div><div className="promise-section"><div className="container"><h2 className="lined-heading">Our Promise</h2><div className="promise-grid"><div><span className="benefit-icon"><Leaf /></span><strong>Natural Ingredients</strong></div><div><span className="benefit-icon"><Heart /></span><strong>Made for Your Family</strong></div><div><span className="benefit-icon"><CookingPot /></span><strong>Traditional Recipes</strong></div><div><span className="benefit-icon"><Sprout /></span><strong>Thoughtfully Made</strong></div></div></div></div></section>;
}

export function HomeContactSection() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const phone = contactPhone;
  const address = contactAddress;
  const whatsapp = contactWhatsApp;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const facebook = process.env.NEXT_PUBLIC_FACEBOOK_URL;
  return <section id="contact" className="home-contact"><div className="section-banner banner-contact"><div className="container"><h2>Contact Us</h2><p>We&apos;d Love to Hear From You</p></div></div><div className="container contact-grid"><div><p className="eyebrow">WE&apos;RE HERE TO HELP</p><h2>Get in Touch</h2><p>Have questions or feedback?<br />We would love to hear from you.</p><div className="contact-details"><a href={`tel:${phone}`}><Phone size={18} />{phone}</a>{email && <a href={`mailto:${email}`}><Mail size={18} />{email}</a>}{address && <p><MapPin size={18} /><span className="contact-address">{address}</span></p>}{whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={18} />WhatsApp</a>}{instagram && <a href={instagram} target="_blank" rel="noreferrer"><InstagramIcon size={18} />Instagram</a>}{facebook && <a href={facebook} target="_blank" rel="noreferrer"><FacebookIcon size={18} />Facebook</a>}</div>{!email && <p className="contact-placeholder">Email contact details are coming soon.</p>}</div><ContactForm email={email} /></div>{address && <section className="container map-section"><h2>Find Us</h2><iframe title="Yaakai business location" src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></section>}</section>;
}