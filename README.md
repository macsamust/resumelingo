# ResumeLingo

A React + TypeScript client backed by a Cloudflare Workers + Hono + D1 API,
using a layered architecture (models → repositories → services →
controllers → routes).

This is a working scaffold, not the finished product — it covers the core
loop (register/login, the profession-aware resume builder, AI-style content
generation, public/private share links, dashboard, subscription tiers, and
an admin console) so you have real code to extend rather than a blank
project.

> **Note:** an earlier version of this project also included `server/`, a
> parity backend on Node + Express + Postgres, kept in sync with `worker/`
> as an alternate way to self-host outside Cloudflare. It was never actually
> deployed, `worker/` was always the real production backend, and
> maintaining two parallel implementations of every feature had become pure
> overhead with no upside — so `server/` was retired and deleted. If you
> ever need to reference it, it's in this repo's git history prior to its
> removal.

## Architecture

```
resumelingo-app/
  client/   React + TypeScript app (Vite)
  worker/   Cloudflare Worker + Hono + TypeScript API (D1) — the only backend
  shared/   TypeScript types shared with worker/ (DB record shapes, config
            value types, auth token payloads) — compiled to shared/dist/,
            which worker/ imports via a file:../shared dependency
```

### `worker/` layers

- **models/** — `User`, `Resume`, `Admin`: wrap a raw D1 row with behavior
  (e.g. `user.canCreateAdditionalResume()`, `resume.isAccessibleBy(userId,
  password)`).
- **repositories/** — one per table, built fresh per request from the D1
  binding (`c.env.DB`) via `createServices(env)` — Workers have no
  cross-request module-level state, unlike a long-lived Node process.
- **services/** — business logic: `ResumeService`, `AuthService`,
  `AdminService`, `SubscriptionService` (Stripe), `ContentGenerator.ts` (the
  rule-based "AI" resume writer — pure logic, no I/O).
- **controllers/routes/** — Hono handlers and route wiring, including a
  full admin console API (`admin.routes.ts`) behind its own JWT auth.
- **config/** — static product data: `professions.ts` (the question set per
  profession), `templates.ts` (resume templates), `subscriptionPlans.ts`
  (Starter/Professional/Premium).

### Frontend layers (`client/src`)

- **api/** — `ApiClient` is a base class handling fetch + auth headers +
  error normalization; `AuthApi`, `ResumeApi`, `CatalogApi`, `AdminApi`
  extend it. Talks to the Worker at `/api` (same origin in production).
- **context/AuthContext.tsx** — React context wrapping the auth API and
  current user. `AdminAuthContext.tsx` is the separate admin equivalent.
- **components/marketing/** — the public landing page (hero, mission/vision,
  pricing, Career Center, templates, success stories, etc.), data-driven
  where it matters (Pricing and Templates fetch live from the API).
- **components/builder/** — `DynamicQuestionForm` renders whatever question
  set the selected profession returns; `ResumePreview` shows the
  live/generated content, reused as-is by the admin console's own resume
  editor and template preview.
- **pages/** — routed pages: landing, login, signup, dashboard, resume
  builder, resume edit, the public `/r/:slug` resume viewer (supports
  password-protected links), and the full admin console (`pages/admin/`).

---

## Deploying to Cloudflare (Workers + D1)

Frontend and API both run on Cloudflare. One Worker serves the built React
app as static assets **and** runs the API, so there's a single URL and no
CORS to configure in production.

### Prerequisites

- A Cloudflare account (free tier is enough to start).
- Your code pushed to GitHub.
- Node 18+ and npm locally, at least for this first-time setup.

### 1. Install dependencies and log in

```bash
cd worker
npm install
npx wrangler login   # opens a browser to authenticate with Cloudflare
```

### 2. Create the D1 database

```bash
npm run db:create
```

This prints a `database_id`. Open `worker/wrangler.jsonc` and paste it into
the `d1_databases[0].database_id` field (replacing
`REPLACE_WITH_YOUR_DATABASE_ID`). Commit that change.

### 3. Run the migrations

```bash
npm run db:migrate:remote    # applies every migrations/*.sql file to the real hosted DB
npm run db:migrate:local     # optional: same, but for local `wrangler dev` testing
```

D1's `--remote` (production) and `--local` (used by `wrangler dev`) are two
independent database copies — a new migration has to be applied to both
separately, or local dev will be missing tables/columns production already
has.

### 4. Set secrets

```bash
npm run secret:jwt                        # regular user auth
npm run secret:stripe-key                 # Stripe secret key, if billing is enabled
npm run secret:stripe-webhook
npm run secret:stripe-price-professional
npm run secret:stripe-price-premium
npm run secret:resend-key                 # transactional email (password resets, etc.)
```

Each prompts for a value and stores it encrypted on Cloudflare — deliberately
**not** in `wrangler.jsonc`, since that file gets committed to git. For local
`wrangler dev`, copy `.dev.vars.example` to `.dev.vars` and put dev values
there instead (that file is gitignored). An `ADMIN_JWT_SECRET` can also be
set separately from `JWT_SECRET` for the admin console's own token signing —
see `wrangler.jsonc`'s `vars`/secrets and `createServices.ts`.

### 5. Build the client

```bash
cd ../client
npm install
npm run build
```

This produces `client/dist`, which `worker/wrangler.jsonc`'s `assets`
config points at directly (`"directory": "../client/dist"`).

### 6. Deploy

```bash
cd ../worker
npm run deploy
```

Wrangler uploads your Worker code, binds D1, and uploads `client/dist` as
static assets, then prints your live URL — something like
`https://resumelingo.<your-subdomain>.workers.dev`. Open it: the frontend and
`/api/*` are both served from that one origin, so `VITE_API_URL` doesn't
need to be set at all for this deployment (the client defaults to the
relative path `/api`).

### 7. (Optional) Auto-deploy on every push

Cloudflare can rebuild and redeploy automatically whenever you push to
GitHub, instead of you running `npm run deploy` by hand — see
`.github/workflows/ci.yml` for a working GitHub Actions version of this
(typecheck + test on every push/PR, deploy on push to `main`).

Alternatively, via Cloudflare's own dashboard: **Workers & Pages** → your
`resumelingo` Worker → **Settings → Builds → Connect**, point it at your
GitHub repo, root directory `worker`, build command
`npm install && cd ../client && npm install && npm run build`. Cloudflare's
dashboard UI for this changes fairly often, so treat the exact field names
as approximate.

### 8. (Optional) Custom domain

Workers & Pages → your Worker → **Settings → Domains & Routes → Add
custom domain**. Cloudflare handles HTTPS automatically.

### Local dev against the Worker

Two ways to develop locally once the D1 database and secrets are set up:

- **Fastest to match production exactly:** `cd client && npm run build`,
  then `cd worker && npm run dev` (runs `wrangler dev`). This serves the
  built app and the API from one local URL, same as production — but you
  have to rebuild the client after every change (no hot reload).
- **Hot-reload frontend development:** run `wrangler dev` in `worker/` (API
  on `:8787`) and `npm run dev` in `client/` (Vite on `:5173`) at the same
  time, with `VITE_API_URL=http://localhost:8787/api` set in `client/.env`.

---

## What's implemented vs. stubbed

**Implemented:** registration/login (JWT + bcrypt), profession-aware resume
builder with profession-specific question sets, rule-based "AI" content
generation, many resume templates, public/private/password-protected share
links with view counting, dashboard summary (resumes, views, Profile
Strength Score, suggested improvements), Stripe-backed subscription tiers
with resume-count enforcement, and a full admin console (user/resume
management, template/plan/catalog CRUD, audit logging, CSV export, bulk
actions).

**Stubbed / intentionally simple:** the "AI" generator (`ContentGenerator.ts`)
is rule-based templating, not a real LLM call — swap
`RuleBasedContentGenerator` for a real provider behind the same
`IContentGenerator` interface (Workers AI, already available as a binding in
`wrangler.jsonc`, is a natural fit — see `ResumeImportService`/
`AchievementGeneratorService` for existing `env.AI` usage elsewhere in this
codebase). Resume analytics are limited to view count. The "Coming to
Premium" features from the marketing page (Career Portfolio, etc.) are
marketing copy only where no backend exists yet — check `pages/` and
`worker/src/routes/` for what's actually wired up (Career Coach and
Thank You Letter generation, for instance, are real).

See `TODO.md` for a running list of larger, deliberately-deferred
improvements (admin roles/permissions, 2FA, subscriber-facing resume content
editing, etc.).
