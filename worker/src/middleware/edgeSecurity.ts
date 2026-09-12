/**
 * Browser security headers + HTTP→HTTPS redirect for every Worker response.
 *
 * Why this lives at the fetch wrapper (see index.ts) rather than only on
 * `/api/*` Hono middleware: wrangler.jsonc serves the SPA from Cloudflare
 * Static Assets. With `run_worker_first: false` (the previous setting),
 * `/` and other HTML routes never reached this Worker — which is why
 * production was observed serving the same SPA over plain HTTP with no
 * HSTS/CSP/XFO/nosniff/referrer/permissions headers (SEC-01 / SEC-02,
 * 2026-09-11 review of resumelingo.com).
 *
 * `run_worker_first: true` makes this code see HTML and API alike. The
 * notFound handler still serves assets via `env.ASSETS.fetch`; this module
 * then stamps headers on whatever comes back.
 */

/** 180 days. Long enough to be useful in production; short enough to unwind if a forgotten HTTP-only subdomain turns up. No `preload` — apex+www are not yet HTTPS-only in the wild. */
export const HSTS_VALUE = "max-age=15552000; includeSubDomains";

/**
 * Enforcing CSP is limited to directives that cannot break the existing SPA,
 * Stripe hosted Checkout (full-page redirect, not embedded.js), Google Fonts,
 * or the pdf.js worker used by resume import.
 *
 * - `frame-ancestors 'none'` — clickjacking control (pairs with X-Frame-Options).
 * - `upgrade-insecure-requests` — mixed-content HTTP subresources become HTTPS.
 *
 * A tighter policy (script-src / style-src / connect-src) is Report-Only
 * below. Follow-up: add a report-uri, watch for a soak period, then promote
 * the report-only policy to enforcing and drop 'unsafe-inline' if reports
 * stay clean. Do not add `preload` to HSTS until every HTTP hostname under
 * the zone is gone and the HSTS preload submission checklist is documented.
 */
export const CSP_ENFORCING =
  "frame-ancestors 'none'; upgrade-insecure-requests";

/**
 * Conservative report-only policy matching origins the SPA actually uses
 * today (same-origin API + Vite assets, Google Fonts, data:/blob: photos
 * and object-URLs, pdf.js module worker). Stripe Checkout is a navigation
 * away from this origin, so it is not listed. Auth is same-origin `/api`.
 */
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
].join("; ");

export const PERMISSIONS_POLICY =
  "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalDevelopmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return LOCAL_DEV_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local");
}

/**
 * Prefer the URL scheme the Worker actually received; fall back to
 * X-Forwarded-Proto for proxies that always present http:// internally.
 */
export function isHttpsRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
  }
  return false;
}

/**
 * 301 to the same host/path/query on HTTPS. Skipped for wrangler/local
 * hosts so `npm run dev --prefix worker` keeps working over http://.
 */
export function redirectHttpToHttps(request: Request): Response | null {
  if (isHttpsRequest(request)) return null;
  const url = new URL(request.url);
  if (isLocalDevelopmentHost(url.hostname)) return null;
  url.protocol = "https:";
  return new Response(null, {
    status: 301,
    headers: { Location: url.toString() },
  });
}

/** Clone `response` with browser security headers. Preserves CORS and any other existing headers. */
export function applyBrowserSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  headers.set("Content-Security-Policy", CSP_ENFORCING);
  headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);
  if (isHttpsRequest(request)) {
    headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Fetch wrapper: HTTPS redirect first, then the app, then headers on every response (including the redirect). */
export async function fetchWithEdgeSecurity(
  request: Request,
  handle: (request: Request) => Promise<Response> | Response
): Promise<Response> {
  const redirect = redirectHttpToHttps(request);
  if (redirect) return applyBrowserSecurityHeaders(request, redirect);
  return applyBrowserSecurityHeaders(request, await handle(request));
}
