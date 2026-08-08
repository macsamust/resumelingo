# Websume — Full-Stack Scaffold

A starter implementation of the Websume product: a React + TypeScript client,
plus **two interchangeable backends** built with the same object-oriented
layered architecture (models → repositories → services → controllers →
routes):

- **`server/`** — Node.js + Express + Postgres (via `pg`). Good for local
  development, or for hosting anywhere that runs a normal Node process
  (Render, Railway, Fly.io, etc.) alongside a Postgres database.
- **`worker/`** — Cloudflare Workers + Hono + D1. The version to use if
  you're deploying on Cloudflare, since Cloudflare Workers can't run
  Express or native Node addons like `better-sqlite3`.

Both share the same `models/`, `config/`, and business rules — only the
persistence layer (SQL driver), the JWT signing library, and the HTTP
framework differ, because those are the only pieces that actually touch
Node-specific or Workers-specific APIs.

This is a working scaffold, not the finished product — it covers the core
loop (register/login, the profession-aware resume builder, AI-style content
generation, public/private share links, dashboard, subscription tiers) so
you have real code to extend rather than a blank project.

## Architecture

```
websume-app/
  client/   React + TypeScript app (Vite) — same for both backends
  server/   Node + Express + TypeScript API (Postgres via `pg`)
  worker/   Cloudflare Worker + Hono + TypeScript API (D1)
```

### Shared layers (`models/`, `config/`)

- **models/** — `User`, `Resume`: wrap a raw DB row with behavior (e.g.
  `user.canCreateAdditionalResume()`, `resume.isAccessibleBy(userId, password)`).
  Identical in both backends — no I/O.
- **config/** — static product data: `professions.ts` (the question set per
  profession), `templates.ts` (15 resume templates), `subscriptionPlans.ts`
  (Starter/Professional/Premium). Identical in both backends.

### Backend-specific layers

|                    | `server/` (Node)                         | `worker/` (Cloudflare)                          |
|--------------------|---------------------------------------------|----------------------------------------------------|
| HTTP framework     | Express                                   | [Hono](https://hono.dev)                          |
| Database           | Postgres, via `pg` connection pool        | D1 (Cloudflare's SQLite), via `env.DB`            |
| Repositories       | Async methods (`pg`'s driver is Promise-based) | Async methods (D1's driver is Promise-based) |
| JWT signing        | `jsonwebtoken` (Node `crypto`)             | `jose` (Web Crypto API, works in both dev & prod) |
| Password hashing   | `bcryptjs`                                 | `bcryptjs` (pure JS, works unchanged)             |
| Request context    | `req`/`res`                                | Hono `Context` (`c`)                               |
| Per-request wiring  | Repositories share one module-level `Pool` (connection pooling handled by `pg` itself) | `createServices(env)` builds fresh repositories/services per request from `c.env.DB`, since the D1 binding only exists inside a request |

`ContentGenerator.ts` (the rule-based "AI" resume writer) is pure logic with
no I/O at all, so it's copied byte-for-byte between the two backends.

### Frontend layers (`client/src`)

- **api/** — `ApiClient` is a base class handling fetch + auth headers +
  error normalization; `AuthApi`, `ResumeApi`, `CatalogApi` extend it. Talks
  to whichever backend is running at `/api` (same origin in production).
- **context/AuthContext.tsx** — React context wrapping the auth API and
  current user.
- **components/marketing/** — the public landing page (hero, mission/vision,
  pricing, Career Center, templates, success stories, etc.), data-driven
  where it matters (Pricing and Templates fetch live from the API).
- **components/builder/** — `DynamicQuestionForm` renders whatever question
  set the selected profession returns; `ResumePreview` shows the
  live/generated content.
- **pages/** — routed pages: landing, login, signup, dashboard, resume
  builder, resume edit, and the public `/r/:slug` resume viewer (supports
  password-protected links).

---

## Option A — Node + Express + Postgres (local dev, or Render)

Requires Node.js 18+, npm, and a Postgres database (local, or a free-tier
managed one — see the Render section below). This was scaffolded in a
sandbox without registry access, so **`npm install` has not been run or
verified here** — run it yourself and fix up any dependency version hiccups
if they come up.

```bash
# from the websume-app/ folder
npm run install:all

# copy env files and adjust if needed
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set `DATABASE_URL` to a real Postgres connection
string (local Postgres, or a hosted one — see below). The server creates its
tables automatically on startup if they don't exist yet (`migrate()` in
`server/src/db/database.ts`), so there's no separate migration command to
run for this backend.

```bash
# terminal 1 — API on http://localhost:4000
npm run dev:server

# terminal 2 — app on http://localhost:5173
npm run dev:client

# optional: seed a demo account (demo@websume.app / password123) + one resume
npm run seed
```

For this split local setup, `client/.env` needs
`VITE_API_URL=http://localhost:4000/api` set (the deployed/Cloudflare
version doesn't need this — see Option B below).

### Deploying this backend on Render (free tier)

1. **Create a Postgres database:** Render dashboard → **New → Postgres** →
   choose the **Free** instance type. Once it's up, copy the **External
   Database URL** from its dashboard page.
2. **Create a web service** for `server/`: Render dashboard → **New → Web
   Service** → connect your GitHub repo.
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or a paid one for no spin-down/cold-starts)
3. **Set environment variables** on the web service: `DATABASE_URL` (paste
   the External Database URL from step 1), `JWT_SECRET` (any long random
   string), `CLIENT_ORIGIN` (the URL your frontend is served from, so CORS
   allows it).
4. Deploy. On first boot, `migrate()` creates the `users`/`resumes` tables
   in your Postgres database automatically.

Free-tier caveats worth knowing before you rely on this for real data: free
Render Postgres databases **expire 30 days after creation** (14-day grace
period to upgrade before deletion), and free web services **spin down after
15 minutes idle** (about a minute to wake back up on the next request). Fine
for testing/demos; for anything you want to keep long-term, upgrade the
Postgres instance to a paid plan before the 30-day mark.

---

## Option B — Deploying to Cloudflare (Workers + D1)

This is the path if you want everything — frontend and API — hosted on
Cloudflare. One Worker serves the built React app as static assets **and**
runs the API, so there's a single URL and no CORS to configure in
production.

### Prerequisites

- A Cloudflare account (free tier is enough to start).
- Your code pushed to GitHub (you said it already is).
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

### 3. Run the migration

```bash
npm run db:migrate:remote    # applies migrations/0001_init.sql to the real hosted DB
npm run db:migrate:local     # optional: same, but for local `wrangler dev` testing
```

### 4. Set the JWT secret

```bash
npm run secret:jwt
```

This prompts for a value and stores it encrypted on Cloudflare — deliberately
**not** in `wrangler.jsonc`, since that file gets committed to git. For local
`wrangler dev`, copy `.dev.vars.example` to `.dev.vars` and put a dev secret
there instead (that file is gitignored).

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
`https://websume.<your-subdomain>.workers.dev`. Open it: the frontend and
`/api/*` are both served from that one origin, so `VITE_API_URL` doesn't
need to be set at all for this deployment (the client defaults to the
relative path `/api`).

### 7. (Optional) Auto-deploy on every push

Cloudflare can rebuild and redeploy automatically whenever you push to
GitHub, instead of you running `npm run deploy` by hand:

1. Cloudflare dashboard → **Workers & Pages** → your `websume` Worker →
   **Settings → Builds → Connect**.
2. Point it at your GitHub repo.
3. Set **root directory** to `worker`, and a **build command** that builds
   the client first, e.g. `npm install && cd ../client && npm install && npm run build`.

Cloudflare's dashboard UI for this changes fairly often, so treat the exact
field names as approximate — the concept (root directory + build command
that produces `client/dist` before `wrangler deploy` runs) is what matters.

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
builder with 10 profession question sets, rule-based "AI" content generation,
15 templates, public/private/password-protected share links with view
counting, dashboard summary (resumes, views, Profile Strength Score,
suggested improvements), subscription tiers with resume-count enforcement.

**Stubbed / intentionally simple:** the "AI" generator is rule-based
templating, not a real LLM call (swap `RuleBasedContentGenerator` for a real
provider behind the same `IContentGenerator` interface — on Cloudflare,
Workers AI is a natural fit). Resume analytics are limited to view count.
The "Coming to Premium" features from the marketing page (Career Portfolio,
AI Career Coach, Recruiter Mode, etc.) are marketing copy only — no backend
for them yet. The `npm run seed` demo-data script only exists for the
Node/`server` backend; there's no D1 equivalent yet, so on Cloudflare just
sign up through the UI.

Note on running both backends: they're two independent, complete options —
not meant to be mixed. `server/`'s Postgres database and `worker/`'s D1
database are separate, unrelated databases; D1 is only reachable from inside
a Cloudflare Worker, so `server/` (wherever it's hosted) can never read from
or write to it. Pick one backend to actually run in production.
