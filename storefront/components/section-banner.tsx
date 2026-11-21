export function SectionBanner({ title, subtitle, variant }: { title: string; subtitle: string; variant: "products" | "about" | "contact" }) {
  return <section className={`section-banner banner-${variant}`}><div className="container"><h1>{title}</h1><p>{subtitle}</p></div></section>;
}