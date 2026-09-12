import { describe, expect, it } from "vitest";
import {
  applyBrowserSecurityHeaders,
  CSP_ENFORCING,
  CSP_REPORT_ONLY,
  fetchWithEdgeSecurity,
  HSTS_VALUE,
  isHttpsRequest,
  isLocalDevelopmentHost,
  PERMISSIONS_POLICY,
  redirectHttpToHttps,
} from "./edgeSecurity";

describe("isLocalDevelopmentHost", () => {
  it("treats loopback and *.localhost / *.local as local", () => {
    expect(isLocalDevelopmentHost("localhost")).toBe(true);
    expect(isLocalDevelopmentHost("127.0.0.1")).toBe(true);
    expect(isLocalDevelopmentHost("[::1]")).toBe(true);
    expect(isLocalDevelopmentHost("app.localhost")).toBe(true);
    expect(isLocalDevelopmentHost("resumelingo.local")).toBe(true);
  });

  it("does not treat production hosts as local", () => {
    expect(isLocalDevelopmentHost("resumelingo.com")).toBe(false);
    expect(isLocalDevelopmentHost("www.resumelingo.com")).toBe(false);
  });
});

describe("isHttpsRequest", () => {
  it("trusts an https: URL", () => {
    expect(isHttpsRequest(new Request("https://resumelingo.com/"))).toBe(true);
  });

  it("treats a plain http: URL as insecure", () => {
    expect(isHttpsRequest(new Request("http://resumelingo.com/"))).toBe(false);
  });

  it("honors X-Forwarded-Proto when the URL scheme is http", () => {
    expect(
      isHttpsRequest(
        new Request("http://resumelingo.com/", { headers: { "X-Forwarded-Proto": "https" } })
      )
    ).toBe(true);
    expect(
      isHttpsRequest(
        new Request("http://resumelingo.com/", { headers: { "X-Forwarded-Proto": "http, https" } })
      )
    ).toBe(false);
  });
});

describe("redirectHttpToHttps", () => {
  it("301s production HTTP to the same path and query on HTTPS", () => {
    const response = redirectHttpToHttps(
      new Request("http://resumelingo.com/login?next=%2Fdashboard")
    );
    expect(response).not.toBeNull();
    expect(response!.status).toBe(301);
    expect(response!.headers.get("Location")).toBe(
      "https://resumelingo.com/login?next=%2Fdashboard"
    );
  });

  it("does not redirect HTTPS or local wrangler hosts", () => {
    expect(redirectHttpToHttps(new Request("https://resumelingo.com/"))).toBeNull();
    expect(redirectHttpToHttps(new Request("http://localhost:8787/api/health"))).toBeNull();
    expect(redirectHttpToHttps(new Request("http://127.0.0.1:8787/"))).toBeNull();
  });
});

describe("applyBrowserSecurityHeaders", () => {
  it("sets the SEC-01 headers on an HTTPS response and keeps existing CORS", () => {
    const inbound = new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://resumelingo.com",
      },
    });
    const outbound = applyBrowserSecurityHeaders(new Request("https://resumelingo.com/api/health"), inbound);
    expect(outbound.status).toBe(200);
    expect(outbound.headers.get("Access-Control-Allow-Origin")).toBe("https://resumelingo.com");
    expect(outbound.headers.get("X-Frame-Options")).toBe("DENY");
    expect(outbound.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(outbound.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(outbound.headers.get("Permissions-Policy")).toBe(PERMISSIONS_POLICY);
    expect(outbound.headers.get("Content-Security-Policy")).toBe(CSP_ENFORCING);
    expect(outbound.headers.get("Content-Security-Policy-Report-Only")).toBe(CSP_REPORT_ONLY);
    expect(outbound.headers.get("Strict-Transport-Security")).toBe(HSTS_VALUE);
    expect(HSTS_VALUE).toContain("includeSubDomains");
    expect(HSTS_VALUE).not.toMatch(/preload/i);
    expect(CSP_ENFORCING).toContain("frame-ancestors 'none'");
    expect(CSP_REPORT_ONLY).toContain("fonts.googleapis.com");
  });

  it("omits HSTS on HTTP (browsers ignore it there; local wrangler stays HTTP)", () => {
    const outbound = applyBrowserSecurityHeaders(
      new Request("http://localhost:8787/"),
      new Response("ok")
    );
    expect(outbound.headers.get("Strict-Transport-Security")).toBeNull();
    expect(outbound.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

describe("fetchWithEdgeSecurity", () => {
  it("redirects insecure production requests before the app runs", async () => {
    let called = false;
    const response = await fetchWithEdgeSecurity(new Request("http://resumelingo.com/api/health"), () => {
      called = true;
      return new Response("should not run");
    });
    expect(called).toBe(false);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://resumelingo.com/api/health");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
  });

  it("applies headers to the app response on HTTPS", async () => {
    const response = await fetchWithEdgeSecurity(
      new Request("https://resumelingo.com/"),
      () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } })
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<html></html>");
    expect(response.headers.get("Strict-Transport-Security")).toBe(HSTS_VALUE);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
