# Yaakai Storefront

Next.js, TypeScript, and Tailwind CSS storefront. Run `npm install` and `npm run dev`, then visit http://localhost:3000. Use `npm run lint` and `npm run build` for validation.

Home, About, and Contact share the single `/` page and are reached through in-page navigation. The product catalogue is at `/products`; product details, cart, and checkout have their own shopping routes. The legacy `/about` and `/contact` paths redirect to their homepage sections.

## Supabase PostgreSQL

In Supabase, create a project and use **Connect → Session pooler** to copy its connection string. Render web services can be IPv4-only; Supabase recommends the session pooler on port `5432` for a persistent backend in that case. Keep `sslmode=require` in the URL. Match the Render service's region to the Supabase project region where possible.

For local development, copy `.env.example` to `.env.local` and set `DATABASE_URL`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`. Set `ADMIN_SESSION_SECRET` to at least 32 random characters. Never put these secrets in `NEXT_PUBLIC_` variables or commit `.env.local`. Initialize tables and the starter catalogue/inventory with `npm --prefix storefront run db:setup`; this seeds no orders or expenses.

The admin API verifies credentials on the server and uses a signed, HTTP-only, SameSite=Strict cookie. `DATABASE_URL` must use SSL. The Stock section manages raw materials and store supplies; finished-product stock is managed separately in Products. `/api/health` checks the database and is used by Render before routing traffic.

## Deploy to Render

The repository root contains `render.yaml`. The Blueprint uses a free Node web service in Singapore, runs `npm ci --include=dev && npm run build`, starts with `npm start`, and checks `/api/health`. Change the Render region in `render.yaml` to match your Supabase project region before deployment. Free services can sleep when idle and take time to wake up.

1. Create a Supabase project and copy its Session pooler connection string with `sslmode=require`. Replace the password placeholder; URL-encode special characters in the password.
2. From the repository root, run `npm --prefix storefront ci --include=dev`. Copy `storefront/.env.example` to `storefront/.env.local`, then privately set `DATABASE_URL` and your admin credentials there. Do not commit this file or share its secrets.
3. Run `npm --prefix storefront run db:setup` locally and confirm it succeeds before deploying. Render's free plan does not run pre-deploy commands; repeat the appropriate database setup or migration manually before deploying future schema changes.
4. Push the repository to GitHub/GitLab/Bitbucket, then in Render choose **New → Blueprint** and select it. Provide the same `DATABASE_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` during setup. Render generates `ADMIN_SESSION_SECRET`.

After the deploy is healthy, open the Render service URL at `/admin`, sign in with the configured admin email and password, then confirm **POSTGRESQL** in the sidebar. If health checks fail, verify the Supabase session-pooler host, username, password, region, and `sslmode=require` in `DATABASE_URL`.

## Before Taking Orders

The public checkout is not yet connected to create PostgreSQL orders or process payment. The admin will show orders only after a real checkout/order endpoint is implemented. Confirm sample prices, costs, and the initial inventory quantities before using financial reports; replace the starter values in `scripts/init-db.mjs` as needed before first setup. Back up Supabase, use a custom domain, and configure transactional email/shipping/payment integrations before launch.

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

The customer cart is stored in the browser's local storage. Prices are illustrative and must be validated on the server when a real checkout is implemented.
