# ResumeLingo — Tech Stack & Services Inventory

Snapshot taken 2026-10-23 from `wrangler.jsonc`, the `package.json` files, installed `node_modules` versions, and `.github/workflows/ci.yml`. Versions are what was installed at that time; re-check `package-lock.json` for current values.

## Platform and hosting

| Resource | Version | Description | Type |
|---|---|---|---|
| Cloudflare Workers | compat date 2026-01-01, `nodejs_compat` | Runs the API and serves the site at the edge | Hosting / compute |
| Cloudflare Static Assets | n/a | Serves the built React app (`client/dist`), SPA fallback | Hosting |
| Cloudflare D1 (`resumelingo-db`) | n/a | Only database. Migrations in `worker/migrations` (latest 0050) | Database |
| Cloudflare Workers AI | n/a | Resume import parsing, keyword suggestions | AI service |
| Cloudflare Cron Triggers | 4 schedules | View digest (Mon 14:00 UTC), security scan (13:00), refresh nudge (15:00), stale-account cleanup (every 15 min) | Scheduler |
| Cloudflare DNS / routing | n/a | resumelingo.com. Registrar not recorded in the repo | Network |

## Third-party services

| Resource | Version | Description | Type |
|---|---|---|---|
| Stripe | API via SDK 17.7.0 | Hosted Checkout, billing portal, webhooks, promo codes | Payments |
| Resend | HTTP API | All transactional email; resumelingo.com verified sending domain | Email |
| GitHub | n/a | Source repo (`macsamust/resumelingo`) | Source control |
| GitHub Actions | `ci.yml` | Typecheck and tests on push/PR; deploy job on `main` | CI/CD |
| Google Fonts | n/a | Fonts loaded by the client | Third-party asset |
| Google Analytics | n/a | Referenced in client code; confirm whether active | Analytics |

## Backend libraries (`worker/`)

| Package | Version | Purpose |
|---|---|---|
| hono | 4.13.5 | Web framework and routing |
| stripe | 17.7.0 | Stripe SDK |
| jose | 5.10.0 | JWT signing and verification |
| bcryptjs | 2.4.3 | Password hashing |
| nanoid | 3.3.18 | ID generation |
| @resumelingo/shared | 1.0.0 (local) | Shared TypeScript types |

## Frontend libraries (`client/`)

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | 18.3.1 | UI |
| react-router-dom | 6.30.4 | Routing |
| jspdf | 4.2.1 | PDF export |
| pdfjs-dist | 4.10.38 | Reading uploaded PDFs |
| mammoth | 1.12.1 | Reading uploaded Word files |
| qrcode | 1.5.4 | QR codes |

## Tooling

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22 (CI) | Build/deploy runtime |
| TypeScript | 5.9.3 | Typed code |
| Vite | 6.4.3 | Frontend build |
| @vitejs/plugin-react | 4.7.0 | Vite React support |
| Wrangler | 4.131.1 | Cloudflare CLI (deploy, migrations) |
| Vitest | 2.1.9 | Tests |
| @cloudflare/workers-types | 5.20260911.1 | Worker typings |

## Secrets (names only, set via `wrangler secret put`)

`JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_PREMIUM`, `RESEND_API_KEY`.

## Not confirmable from the repo

- Domain registrar.
- Cloudflare plan tier.
- Whether Google Analytics is live.
