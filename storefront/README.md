# Yaakai Storefront

Next.js, TypeScript, and Tailwind CSS storefront. Run `npm install` and `npm run dev`, then visit http://localhost:3000. Use `npm run lint` and `npm run build` for validation.

Home, About, and Contact share the single `/` page and are reached through in-page navigation. The product catalogue is at `/products`; product details, cart, and checkout have their own shopping routes. The legacy `/about` and `/contact` paths redirect to their homepage sections.

## Business Details

Set the following optional public variables in `.env.local` and restart the server. Public variables are included in browser bundles and are embedded at build time.

```text
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_CONTACT_ADDRESS=
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_INSTAGRAM_URL=
NEXT_PUBLIC_FACEBOOK_URL=
```

Use a country code for the WhatsApp number. Contact links, social links, and the map are shown only when configured. The contact form opens the visitor's email application; it does not send mail from the server.

Default contact details are set to 226, Gandhi Road, T.R.Pattinam, Karaikal, Puducherry 609606 and +91 8098874435. Environment variables can override them.

## Before Launch

- Supplied Yaakai photographs are installed in `public/images/yaakai/` and used across the hero, product cards, story, and section banners.
- Confirm the sample weights and prices in `lib/products.ts`, then add verified ingredient lists and any further product variants.
- Connect a real newsletter provider, shipping calculation, order service, and payment gateway. Checkout currently collects no data and cannot place an order.
- Verify business claims, legal policies, contact information, and image usage rights before publishing.

The cart is stored in the browser's local storage. Prices are illustrative and must be validated on the server when a real checkout is implemented.
