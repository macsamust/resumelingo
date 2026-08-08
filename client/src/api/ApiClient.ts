// Relative by default: once deployed, the Worker serves both the built
// client and the /api/* routes from the same origin, so no absolute URL
// (and no CORS) is needed. Override with VITE_API_URL only when running
// the Vite dev server (port 5173) against a separately-running
// `wrangler dev` (port 8787) for hot-reload frontend development.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly reason?: string) {
    super(message);
  }
}

/**
 * Base HTTP client. Resource-specific API classes (AuthApi, ResumeApi, ...)
 * extend this rather than calling fetch() directly, so token attachment,
 * base-URL handling, and error normalization live in exactly one place.
 */
export class ApiClient {
  protected token: string | null = null;

  // storageKey defaults to the regular-user token key; AdminApi passes a
  // distinct key ("websume_admin_token") so an admin session and a regular
  // user session can coexist in the same browser without clobbering each
  // other's token.
  constructor(private readonly baseUrl: string = API_URL, private readonly storageKey: string = "websume_token") {
    this.token = localStorage.getItem(this.storageKey);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem(this.storageKey, token);
    else localStorage.removeItem(this.storageKey);
  }

  protected async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json().catch(() => ({})) : undefined;

    if (!response.ok) {
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
}
