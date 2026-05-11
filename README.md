# tarout-shop-web

Minimal e-commerce storefront — Vite + vanilla JS, no framework. Talks to
[tarout-shop-api](https://github.com/najialii/tarout-shop-api).

Product grid, add-to-cart, quantity controls, checkout (posts the cart to the
API and shows an order confirmation).

## Run locally

1. Start the API first (see tarout-shop-api) — it listens on `:3000`.
2. Then:

```bash
npm install
npm run dev          # http://localhost:5173
```

With no `.env`, the frontend defaults to `http://localhost:3000` for the API.

## Build for production

```bash
npm run build        # → dist/  (static files)
npm run preview      # serve the build locally to test
```

Set `VITE_API_URL` before `npm run build` so the bundle points at your
deployed API:

```bash
VITE_API_URL=https://tarout-shop-api-abc123.tarout.app npm run build
```

(Vite inlines env vars at build time, so this must be set when you build, not
at runtime.)

## Environment

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the backend API |

See `.env.example`.

## Deploy

It's a static site after `npm run build`. Any static host works (Tarout
static apps, Netlify, GitHub Pages, etc.). On Tarout: create an app from this
repo, framework auto-detects as Vite, build command `npm run build`, output
dir `dist`. Set `VITE_API_URL` as a build-time env var pointing at the
deployed API, and set the API's `ALLOWED_ORIGIN` to this app's URL.
