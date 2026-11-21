"use client";

import { usePathname } from "next/navigation";
import { Footer, Header, WhatsAppFloating } from "@/components/site-shell";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <><Header />{children}<Footer /><WhatsAppFloating /></>;
}