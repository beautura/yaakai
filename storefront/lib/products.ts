export type Product = {
  slug: string;
  name: string;
  category: string;
  description: string;
  ingredients?: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  variants: { weight: string; price: number }[];
};

export const products: Product[] = [
  { slug: "curry-leaf-thokku", name: "Curry Leaf Thokku", category: "Thokku", description: "A traditional savoury accompaniment for your everyday meals.", image: "/images/yaakai/04-curry-leaf-thokku-bowl.jpg", imageAlt: "Yaakai curry leaf thokku served in a wooden bowl", featured: true, variants: [{ weight: "250 g", price: 249 }, { weight: "500 g", price: 469 }] },
  { slug: "honey-nuts", name: "Honey Nuts", category: "Honey & nuts", description: "A sweet and crunchy favourite to enjoy by the spoonful.", image: "/images/yaakai/05-honey-nuts.png", imageAlt: "Honey nuts in a wooden bowl", featured: true, variants: [{ weight: "250 g", price: 399 }, { weight: "500 g", price: 749 }] },
  { slug: "health-mix-powder", name: "Health Mix Powder", category: "Health mixes", description: "A comforting pantry staple inspired by traditional recipes.", image: "/images/yaakai/06-health-mix-powder.png", imageAlt: "Traditional health mix powder in a wooden bowl", featured: true, variants: [{ weight: "250 g", price: 349 }, { weight: "500 g", price: 649 }] },
  { slug: "immunity-mix", name: "Immunity Mix", category: "Health mixes", description: "A familiar blend made for a comforting daily ritual.", image: "/images/yaakai/07-turmeric-mix.jpg", imageAlt: "Golden turmeric mix in a wooden bowl", featured: true, variants: [{ weight: "250 g", price: 299 }, { weight: "500 g", price: 549 }] },
  { slug: "traditional-masala-powders", name: "Traditional Masala Powders", category: "Masala", description: "A touch of traditional flavour for your everyday cooking.", image: "/images/yaakai/08-traditional-chilli-powder.jpg", imageAlt: "Traditional chilli powder in a wooden bowl", featured: true, variants: [{ weight: "100 g", price: 199 }, { weight: "250 g", price: 399 }] },
];

export const formatPrice = (price: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);