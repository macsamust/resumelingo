# Websume — Full-Stack Scaffold

A starter implementation of the Websume product: a React + TypeScript client and a
Node.js/Express + TypeScript backend, built with an object-oriented layered
architecture (models → repositories → services → controllers → routes).

This is a working scaffold, not the finished product — it covers the core loop
(register/login, the profession-aware resume builder, AI-style content
generation, public/private share links, dashboard, subscription tiers) so you
have real code to extend rather than a blank project.

## Architecture

```
websume-app/
  server/   Node + Express + TypeScript API (SQLite via better-sqlite3)
  client/   React + TypeScript app (Vite)
```

### Backend layers (server/src)

- **models/** — `User`, `Resume`: wrap a raw DB row with behavior (e.g.
  `user.canCreateAdditionalResume()`, `resume.isAccessibleWithout(password)`).
- **repositories/** — `BaseRepository<T>` is a generic CRUD base class;
  `UserRepository` / `ResumeRepository` extend it and add only their
  table-specific queries. This is the only layer that touches SQL.
- **services/** — business logic. Notably `ContentGenerator.ts` defines an
  `IContentGenerator` interface with a `RuleBasedContentGenerator`
  implementation (the "instead of 'Managed team' → 'Led a cross-functional
  engineering team of twelve...'" transformation from the product brief). Swap
  in an `OpenAIContentGenerator implements IContentGenerator` later without
  touching `ResumeService` or any controller.
- **controllers/** — thin HTTP adapters; all real logic lives in services.
- **routes/** — Express routers, one per resource, mounted under `/api`.
- **middleware/** — JWT auth guard + centralized error handler that maps
  custom error classes (`AuthError`, `ResumeLimitError`, ...) to HTTP status
  codes.
- **config/** — static product data as typed arrays: `professions.ts` (the
  question set per profession), `templates.ts` (15 resume templates),
  `subscriptionPlans.ts` (Starter/Professional/Premium, matching the pricing
  in the product overview).

### Frontend layers (client/src)

- **api/** — `ApiClient` is a base class handling fetch + auth headers +
  error normalization; `AuthApi`, `ResumeApi`, `CatalogApi` extend it.
- **context/AuthContext.tsx** — React context wrapping the auth API and
  current user.
- **components/marketing/** — the public landing page, ported from the
  original static site (hero, mission/vision, pricing, Career Center,
  templates, success stories, etc.), now data-driven where it matters
  (Pricing and Templates fetch live from the API).
- **components/builder/** — `DynamicQuestionForm` renders whatever question
  set the selected profession returns; `ResumePreview` shows the live/generated
  content.
- **pages/** — routed pages: landing, login, signup, dashboard, resume
  builder, resume edit, and the public `/r/:slug` resume viewer (supports
  password-protected links).

## Getting started

Requires Node.js 18+ and npm. This was scaffolded in a sandbox without
registry access, so **`npm install` has not been run or verified here** —
run it yourself and fix up any dependency version hiccups if they come up.

```bash
# from the websume-app/ folder
npm run install:all

# copy env files and adjust if needed
cp server/.env.example server/.env
cp client/.env.example client/.env

# terminal 1 — API on http://localhost:4000
npm run dev:server

# terminal 2 — app on http://localhost:5173
npm run dev:client

# optional: seed a demo account (demo@websume.app / password123) + one resume
npm run seed
```

The API creates a local SQLite file at `server/data/websume.db` on first run
— no external database needed.

## What's implemented vs. stubbed

**Implemented:** registration/login (JWT + bcrypt), profession-aware resume
builder with 10 profession question sets, rule-based "AI" content generation,
15 templates, public/private/password-protected share links with view
counting, dashboard summary (resumes, views, Profile Strength Score,
suggested improvements), subscription tiers with resume-count enforcement.

**Stubbed / intentionally simple:** the "AI" generator is rule-based
templating, not a real LLM call (swap `RuleBasedContentGenerator` for a real
provider behind the same `IContentGenerator` interface). Resume analytics are
limited to view count. The "Coming to Premium" features from the marketing
page (Career Portfolio, AI Career Coach, Recruiter Mode, etc.) are marketing
copy only — no backend for them yet.
