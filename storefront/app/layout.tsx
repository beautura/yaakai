import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { StorefrontShell } from "@/components/storefront-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Yaakai | Tradition in Every Bite", template: "%s | Yaakai" },
  description: "Discover traditional Tamil food and pantry favourites at Yaakai.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><CartProvider><StorefrontShell>{children}</StorefrontShell></CartProvider></body>
    </html>
  );
}
