// The record/catalog/token type definitions live in
// ../../../shared/src/index.ts, shared with server/'s identical barrel — see
// that file for the canonical source. Re-exported here so every existing
// `from "../types"` / `from "../../types"` import elsewhere in worker/ keeps
// working unchanged. `Env` stays local since it's worker-only (Cloudflare
// bindings, depends on @cloudflare/workers-types).
export * from "@resumelingo/shared";

/** Cloudflare bindings available on every request (see wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CLIENT_ORIGIN: string;
  /** Falls back to JWT_SECRET if unset — see services/AdminService.ts. */
  ADMIN_JWT_SECRET?: string;
  /** Optional bootstrap-admin credentials — see AdminService.ensureBootstrapAdmin. */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  /** Stripe billing (Phase 4) — see services/StripeService.ts and SubscriptionService.ts. All optional so the app still runs without billing configured. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PROFESSIONAL?: string;
  STRIPE_PRICE_PREMIUM?: string;
  /** Resend (email) — see services/EmailService.ts. Optional so the app still runs without it configured; password reset requests will just fail until it's set. */
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}
