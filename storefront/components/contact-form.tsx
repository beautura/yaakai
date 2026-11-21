"use client";

import { ArrowRight } from "lucide-react";

export function ContactForm({ email }: { email?: string }) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    const data = new FormData(event.currentTarget);
    const subject = String(data.get("subject") || "Yaakai enquiry");
    const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nPhone: ${data.get("phone")}\n\n${data.get("message")}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return <form className="contact-form" onSubmit={submit}><h2>Send Us a Message</h2><p>{email ? "Your message will open in your email app." : "Online enquiries will be available when contact details are configured."}</p><label>Name<input name="name" autoComplete="name" required disabled={!email} /></label><label>Email<input name="email" type="email" autoComplete="email" required disabled={!email} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" disabled={!email} /></label><label>Subject<input name="subject" required disabled={!email} /></label><label>Message<textarea name="message" rows={5} required disabled={!email} /></label><button className="button" type="submit" disabled={!email}>Send Message <ArrowRight size={16} /></button></form>;
}