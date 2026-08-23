import { describe, expect, it } from "vitest";
import { assertJobApplicationSizeOk, JobApplicationTooLargeError } from "./JobApplicationService";

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
