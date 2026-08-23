import { describe, expect, it } from "vitest";
import { assertJobApplicationSizeOk, isStaleApplication, JobApplicationTooLargeError } from "./JobApplicationService";
import { JobApplicationRecord } from "../types";

function makeApplication(overrides: Partial<JobApplicationRecord>): JobApplicationRecord {
  return {
    id: "app1",
    userId: "user1",
    resumeId: null,
    company: "Acme",
    role: "Engineer",
    status: "applied",
    appliedDate: null,
    link: "",
    notes: "",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assertJobApplicationSizeOk", () => {
  it("allows undefined, empty, and reasonably sized notes/links", () => {
    expect(() => assertJobApplicationSizeOk(undefined, undefined)).not.toThrow();
    expect(() => assertJobApplicationSizeOk("", "")).not.toThrow();
    expect(() => assertJobApplicationSizeOk("Spoke with recruiter, follow up next week.", "https://example.com/jobs/123")).not.toThrow();
  });

  it("blocks notes over the 4,000-character backstop", () => {
    const oversized = "a".repeat(4_001);
    expect(() => assertJobApplicationSizeOk(oversized, undefined)).toThrow(JobApplicationTooLargeError);
  });

  it("blocks a link over the 2,000-character backstop", () => {
    const oversized = "a".repeat(2_001);
    expect(() => assertJobApplicationSizeOk(undefined, oversized)).toThrow(JobApplicationTooLargeError);
  });

  it("allows notes/link exactly at the limit", () => {
    expect(() => assertJobApplicationSizeOk("a".repeat(4_000), "a".repeat(2_000))).not.toThrow();
  });
});

describe("isStaleApplication", () => {
  const now = new Date("2026-08-22T00:00:00.000Z").getTime();

  it("is not stale when applied less than 12 months ago", () => {
    const a = makeApplication({ appliedDate: "2026-06-01" });
    expect(isStaleApplication(a, now)).toBe(false);
  });

  it("is stale when applied more than 12 months ago", () => {
    const a = makeApplication({ appliedDate: "2025-01-01" });
    expect(isStaleApplication(a, now)).toBe(true);
  });

  it("falls back to createdAt when appliedDate was never set", () => {
    const recent = makeApplication({ appliedDate: null, createdAt: "2026-06-01T00:00:00.000Z" });
    expect(isStaleApplication(recent, now)).toBe(false);

    const old = makeApplication({ appliedDate: null, createdAt: "2025-01-01T00:00:00.000Z" });
    expect(isStaleApplication(old, now)).toBe(true);
  });
});
