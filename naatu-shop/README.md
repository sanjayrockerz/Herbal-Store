# Naatu Shop Frontend (Supabase)

This is a browser-only React + Vite frontend connected to Supabase.

## Environment Variables

Create `.env` with:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.env.example` already includes the same keys for deployment reference.

## Local Build

```bash
npm install
npm run build
```

## Vercel Deployment

1. Import the `naatu-shop` folder as a Vercel project.
2. In Vercel Project Settings > Environment Variables, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Output directory: `dist`

No custom Node server is required for this frontend deployment.

## Seed Products

If the catalog shows the empty-table warning, seed the `products` table before shipping:

1. Open Supabase SQL Editor and run `seed_products.sql`, or
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env` and run `npm run seed` inside `naatu-shop`.

The seed data is written to the `image` column so the storefront can render the product cards immediately.
