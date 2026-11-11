# ResumeLingo — Tech Stack & Services Inventory

*Snapshot: 2026-10-23. Source: `wrangler.jsonc`, the `package.json` files, installed `node_modules` versions, and `.github/workflows/ci.yml`. Versions are what was installed at the time; check `package-lock.json` for current values.*

## The short version

ResumeLingo runs almost entirely on Cloudflare. One Worker serves both the API and the built React app, a D1 database stores everything, and Workers AI handles resume parsing and keyword suggestions. Only two outside services touch customers directly: Stripe for payments and Resend for email. Code lives on GitHub and is checked by GitHub Actions on every push.

| Layer | What it is | Where it runs |
|---|---|---|
| Frontend | React 18 + Vite | Cloudflare Static Assets |
| API | Hono on a Cloudflare Worker | Cloudflare Workers |
| Data | D1 (SQLite) | Cloudflare D1 |
| AI | Workers AI | Cloudflare |
| Payments | Stripe Checkout + webhooks | Stripe |
| Email | Resend | Resend |
| Source and CI | GitHub + Actions | GitHub |

## Platform and hosting

Cloudflare provides hosting, data, scheduling and AI under a single account, so there is one place to look when something breaks.

| Resource | Version / config | What it does | Type |
|---|---|---|---|
| Cloudflare Workers | compat date 2026-01-01, `nodejs_compat` | Runs the API and serves the site at the edge | Compute |
| Cloudflare Static Assets | n/a | Serves the built React app (`client/dist`) with SPA fallback | Hosting |
| Cloudflare D1 (`resumelingo-db`) | latest migration 0050 | The only database | Database |
| Cloudflare Workers AI | n/a | Resume import parsing, keyword suggestions | AI service |
| Cloudflare Cron Triggers | 4 schedules | Background jobs (see below) | Scheduler |
| Cloudflare DNS / routing | n/a | resumelingo.com. Registrar not recorded in the repo | Network |

**Scheduled jobs**

| Schedule (UTC) | Job |
|---|---|
| Mondays 14:00 | Weekly view digest email |
| Daily 13:00 | Security anomaly scan |
| Daily 15:00 | Resume-refresh nudge |
| Every 15 minutes | Stale-account suspend and cleanup |

## Third-party services

| Resource | Version | What it does | Type |
|---|---|---|---|
| Stripe | API via SDK 17.7.0 | Hosted Checkout, billing portal, webhooks, promo codes | Payments |
| Resend | HTTP API | All transactional email from a verified resumelingo.com domain | Email |
| GitHub | n/a | Source repo (`macsamust/resumelingo`) | Source control |
| GitHub Actions | `ci.yml` | Typecheck and tests on push and PR; deploy job on `main` | CI/CD |
| Google Fonts | n/a | Fonts loaded by the client | Third-party asset |
| Google Analytics | n/a | Referenced in client code; confirm whether it is active | Analytics |

## Libraries

**Backend (`worker/`)**

| Package | Version | Purpose |
|---|---|---|
| hono | 4.13.5 | Web framework and routing |
| stripe | 17.7.0 | Stripe SDK |
| jose | 5.10.0 | JWT signing and verification |
| bcryptjs | 2.4.3 | Password hashing |
| nanoid | 3.3.18 | ID generation |
| @resumelingo/shared | 1.0.0 (local) | Shared TypeScript types |

**Frontend (`client/`)**

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | 18.3.1 | UI |
| react-router-dom | 6.30.4 | Routing |
| jspdf | 4.2.1 | PDF export |
| pdfjs-dist | 4.10.38 | Reading uploaded PDFs |
| mammoth | 1.12.1 | Reading uploaded Word files |
| qrcode | 1.5.4 | QR codes |

## Build and developer tooling

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22 (CI) | Build and deploy runtime |
| TypeScript | 5.9.3 | Typed code |
| Vite | 6.4.3 | Frontend build |
| @vitejs/plugin-react | 4.7.0 | Vite React support |
| Wrangler | 4.131.1 | Cloudflare CLI (deploy, migrations) |
| Vitest | 2.1.9 | Tests |
| @cloudflare/workers-types | 5.20260911.1 | Worker typings |

## Secrets

Set with `wrangler secret put`. Names only; values are never stored in the repo.

| Secret | Used for |
|---|---|
| `JWT_SECRET` | Signing login tokens |
| `STRIPE_SECRET_KEY` | Stripe API (live key in production) |
| `STRIPE_WEBHOOK_SECRET` | Verifying live-mode webhooks |
| `STRIPE_WEBHOOK_SECRET_TEST` | Verifying test-mode webhooks |
| `STRIPE_PRICE_PROFESSIONAL` | Professional plan price ID |
| `STRIPE_PRICE_PREMIUM` | Premium plan price ID |
| `RESEND_API_KEY` | Sending email |

## Not confirmable from the repo

- The domain registrar.
- The Cloudflare plan tier.
- Whether Google Analytics is live.
