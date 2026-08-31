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
  /** Workers AI — see services/ResumeImportService.ts. */
  AI: Ai;
  JWT_SECRET: string;
  CLIENT_ORIGIN: string;
  /** Falls back to JWT_SECRET if unset — see services/AdminService.ts. */
  ADMIN_JWT_SECRET?: string;
  /** Optional bootstrap-admin credentials — see AdminService.ensureBootstrapAdmin. */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  /** Stripe billing (Phase 4) — see services/StripeService.ts and SubscriptionService.ts. All optional so the app still runs without billing configured. */
  STRIPE_SECRET_KEY?: string;
  /** Live-mode webhook endpoint's signing secret ("production-sophisticated-harmony" in the Stripe Dashboard). */
  STRIPE_WEBHOOK_SECRET?: string;
  /**
   * Test-mode webhook endpoint's signing secret ("upbeat-serenity" in the
   * Stripe Dashboard) — a separate value from STRIPE_WEBHOOK_SECRET even
   * though both endpoints point at this same Worker. Stripe issues a
   * distinct signing secret per endpoint *per mode*, so one secret can't
   * verify both; see SubscriptionController.webhook, which tries both in
   * turn. Optional, same as STRIPE_WEBHOOK_SECRET — omit if this Worker
   * never needs to handle Stripe test-mode traffic.
   */
  STRIPE_WEBHOOK_SECRET_TEST?: string;
  STRIPE_PRICE_PROFESSIONAL?: string;
  STRIPE_PRICE_PREMIUM?: string;
  /** Resend (email) — see services/EmailService.ts. Optional so the app still runs without it configured; password reset requests will just fail until it's set. */
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}
