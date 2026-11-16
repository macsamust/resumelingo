import { describe, expect, it } from "vitest";
import { resolveYears, stampYearsForSave, swapYearsPhrase, wholeYearsBetween, YEARS_ASOF_KEY } from "./yearsExperience";

const now = new Date("2027-03-10T12:00:00Z");

describe("wholeYearsBetween", () => {
  it("counts whole anniversaries only", () => {
    expect(wholeYearsBetween("2026-03-10", now)).toBe(1);
    expect(wholeYearsBetween("2026-03-11", now)).toBe(0);
    expect(wholeYearsBetween("2024-12-01", now)).toBe(2);
  });
  it("never goes negative and tolerates bad dates", () => {
    expect(wholeYearsBetween("2028-01-01", now)).toBe(0);
    expect(wholeYearsBetween("not-a-date", now)).toBe(0);
  });
});

describe("resolveYears", () => {
  it("adds elapsed years to the stored base and strips the reserved key", () => {
    const r = resolveYears({ yearsExperience: "8", [YEARS_ASOF_KEY]: "2025-03-10", other: "x" }, "2020-01-01", now);
    expect(r.effective).toBe(10);
    expect(r.answers).toEqual({ yearsExperience: "10", other: "x" });
  });
  it("falls back to the resume's updatedAt when no date is stored", () => {
    expect(resolveYears({ yearsExperience: "8" }, "2026-03-10", now).effective).toBe(9);
  });
  it("leaves non-numeric values alone", () => {
    const r = resolveYears({ yearsExperience: "10-15" }, "2020-01-01", now);
    expect(r.effective).toBeNull();
    expect(r.answers.yearsExperience).toBe("10-15");
  });
});

describe("stampYearsForSave", () => {
  it("keeps the original base and date when the shown value is unchanged", () => {
    const current = resolveYears({ yearsExperience: "8", [YEARS_ASOF_KEY]: "2025-03-10" }, "2025-03-10", now);
    expect(stampYearsForSave({ yearsExperience: "10" }, current, now)).toEqual({
      yearsExperience: "8",
      [YEARS_ASOF_KEY]: "2025-03-10",
    });
  });
  it("re-bases to today when the owner changes the number", () => {
    const current = resolveYears({ yearsExperience: "8", [YEARS_ASOF_KEY]: "2025-03-10" }, "2025-03-10", now);
    expect(stampYearsForSave({ yearsExperience: "12" }, current, now)).toEqual({
      yearsExperience: "12",
      [YEARS_ASOF_KEY]: "2027-03-10",
    });
  });
  it("drops the date when the field is cleared", () => {
    expect(stampYearsForSave({ yearsExperience: "" }, null, now)).toEqual({ yearsExperience: "" });
  });
});

describe("swapYearsPhrase", () => {
  it("only rewrites the exact phrase", () => {
    expect(swapYearsPhrase("Results driven PM with 8+ years of experience.", 8, 10)).toBe("Results driven PM with 10+ years of experience.");
    expect(swapYearsPhrase("Over 8 years in product.", 8, 10)).toBe("Over 8 years in product.");
  });
});
