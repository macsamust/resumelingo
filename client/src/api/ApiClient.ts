// Relative by default: once deployed, the Worker serves both the built
// client and the /api/* routes from the same origin, so no absolute URL
// (and no CORS) is needed. Override with VITE_API_URL only when running
// the Vite dev server (port 5173) against a separately-running
// `wrangler dev` (port 8787) for hot-reload frontend development — see
// vite.config.ts's dev proxy, which makes this unnecessary in practice.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly reason?: string) {
    super(message);
  }
}

/**
 * SEC-A01 (Sep 2026): a single in-flight refresh call shared across every
 * ApiClient instance (AuthApi, ResumeApi, ...) — module-scoped rather than
 * per-instance, since a page can easily fire several authenticated requests
 * at once and they'd otherwise each independently notice the expired
 * `rl_session` cookie and call POST /api/auth/refresh in parallel. Not that
 * calling it twice would be unsafe (refresh isn't rotated in v1 — see
 * AuthService.refreshAccessToken's doc comment), just wasteful. Reset to
 * null once the in-flight call settles so the next real 401 tries again.
 */
let sharedRefreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!sharedRefreshPromise) {
    sharedRefreshPromise = fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        sharedRefreshPromise = null;
      });
  }
  return sharedRefreshPromise;
}

/**
 * Base HTTP client. Resource-specific API classes (AuthApi, ResumeApi, ...)
 * extend this rather than calling fetch() directly, so token attachment,
 * base-URL handling, and error normalization live in exactly one place.
 *
 * SEC-A01 (Sep 2026): regular-user API classes now run in "cookie mode"
 * (the default) — the access token lives in the HttpOnly `rl_session`
 * cookie set by the worker (see worker/src/utils/authCookies.ts), attached
 * automatically by the browser via `credentials: "include"`, never read or
 * held by this class at all. `AdminApi` opts out (`useCookies: false`) and
 * keeps the original localStorage + `Authorization: Bearer` mechanism —
 * admin auth is a deliberately separate, later migration decision, not
 * part of this one.
 */
export class ApiClient {
  protected token: string | null = null;

  constructor(
    private readonly baseUrl: string = API_URL,
    // storageKey only matters in non-cookie (admin) mode — a regular-user
    // client never reads or writes localStorage at all now.
    private readonly storageKey: string = "resumelingo_token",
    private readonly useCookies: boolean = true
  ) {
    if (!this.useCookies) {
      this.token = localStorage.getItem(this.storageKey);
    }
  }

  /** No-op in cookie mode — kept so existing call sites (AdminAuthContext) don't need special-casing; only AdminApi's own bearer-token flow actually uses this. */
  setToken(token: string | null) {
    if (this.useCookies) return;
    this.token = token;
    if (token) localStorage.setItem(this.storageKey, token);
    else localStorage.removeItem(this.storageKey);
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
    if (!this.useCookies && this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  /**
   * `isRetry` guards against refreshing more than once per call and never
   * fires for the auth endpoints that would otherwise loop or misfire on a
   * legitimately-rejected login (a wrong password is a 401 too, but not one
   * a session refresh could ever fix).
   */
  protected async request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers = this.buildHeaders(options.headers as Record<string, string>);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: this.useCookies ? "include" : options.credentials,
    });
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json().catch(() => ({})) : undefined;

    if (!response.ok) {
      const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/register") || path.startsWith("/auth/refresh");
      if (this.useCookies && response.status === 401 && !isRetry && !isAuthEndpoint) {
        const refreshed = await attemptRefresh();
        if (refreshed) return this.request<T>(path, options, true);
      }
      throw new ApiError(body?.error || response.statusText, response.status, body?.reason);
    }
    return body as T;
  }

  protected get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  protected post<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
  }

  protected put<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined });
  }

  protected del<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  /**
   * Fetches a file (e.g. a CSV export) and returns it as a Blob rather than
   * JSON. In cookie mode the browser attaches `rl_session` automatically
   * (via `credentials: "include"`), same as a plain `<a href>` download
   * would — a real advantage over the old bearer-token approach, which
   * needed this separate fetch-based path purely because an `<a href>`
   * can't carry an Authorization header. Kept as its own method rather than
   * routing through request() since a Blob response isn't JSON.
   */
  protected async getBlob(path: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (!this.useCookies && this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
      credentials: this.useCookies ? "include" : undefined,
    });
    if (!response.ok) {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const body = isJson ? await response.json().catch(() => ({})) : undefined;
      throw new ApiError(body?.error || response.statusText, response.status, body?.reason);
    }
    return response.blob();
  }
}
