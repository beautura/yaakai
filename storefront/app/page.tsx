import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CookingPot, Heart, Leaf, ShieldCheck } from "lucide-react";
import { HomeAboutSection, HomeContactSection } from "@/components/home-sections";
import { products } from "@/lib/products";

const benefits = [
  { icon: Leaf, title: "100% Natural", subtitle: "Ingredients" },
  { icon: CookingPot, title: "Traditional", subtitle: "Recipes" },
  { icon: Heart, title: "Good for", subtitle: "Your Health" },
  { icon: ShieldCheck, title: "No", subtitle: "Preservatives" },
];

export default function Home() {
  return (
    <main>
      <section className="home-hero" id="home">
        <div className="hero-photo">
          <Image
            src="/images/yaakai/01-curry-leaf-thokku-hero.jpg"
            alt="Yaakai Curry Leaf Thokku with curry leaves, nuts, and brassware"
            fill
            priority
            sizes="(max-width: 767px) 60vw, 58vw"
          />
        </div>
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">A TASTE OF TAMIL TRADITION</p>
            <h1>Tradition in Every Bite,<br />Health for Life</h1>
            <p className="tamil-tagline" lang="ta">நம் பாரம்பரியம்… நம் ஆரோக்கியம்…</p>
            <p className="hero-qualities">Pure <span>•</span> Natural <span>•</span> Traditional</p>
            <Link className="button" href="/products">Explore Our Products <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="benefits" aria-label="Yaakai values">
        <div className="container benefits-grid">
          {benefits.map(({ icon: Icon, title, subtitle }) => (
            <div className="benefit" key={title}>
              <span className="benefit-icon"><Icon /></span>
              <strong>{title}<br />{subtitle}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="container specialties" aria-labelledby="specialties-title">
        <h2 className="lined-heading" id="specialties-title">Our Specialities</h2>
        <div className="specialty-grid">
          {products.slice(0, 5).map(product => (
            <Link className="specialty-card" href={`/products/${product.slug}`} key={product.slug}>
              <span className="specialty-image">
                <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 20vw, 20vw" />
              </span>
              <strong>{product.name}</strong>
              <span className="circle-arrow"><ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="story-band" aria-label="Yaakai story preview">
        <div className="story-temple" role="img" aria-label="Tamil Nadu temple" />
        <div className="story-band-copy">
          <p className="eyebrow">OUR STORY</p>
          <h2>Rooted in Tradition,<br />Crafted for Today</h2>
          <p>Yaakai brings you the goodness of traditional Tamil recipes, thoughtfully made for the moments shared around your table.</p>
          <Link className="button" href="#about">Know More About Us <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="home-cta">
        <div className="container cta-inner">
          <div>
            <h2>Choose Yaakai for a healthier tomorrow</h2>
            <p>Experience the taste of tradition and the benefits of nature.</p>
          </div>
          <Link className="button cream-button" href="/products">Shop Now <ArrowRight size={16} /></Link>
        </div>
      </section>

      <HomeAboutSection />
      <HomeContactSection />
    </main>
  );
}