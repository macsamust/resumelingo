const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
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

  constructor(private readonly baseUrl: string = API_URL) {
    this.token = localStorage.getItem("websume_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem("websume_token", token);
    else localStorage.removeItem("websume_token");
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
      throw new ApiError(body?.error || response.statusText, response.status);
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
