import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { SectionBanner } from "@/components/section-banner";

export const metadata: Metadata = { title: "Our Products", description: "Browse Yaakai's traditional Tamil food and pantry favourites." };
export default function ProductsPage() { return <main><SectionBanner title="Our Products" subtitle="Traditional • Natural • Wholesome" variant="products" /><Catalogue /></main>; }