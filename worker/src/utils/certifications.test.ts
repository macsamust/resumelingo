import { describe, expect, it } from "vitest";
import { certificationsAnswer, splitLegacyCertifications } from "./certifications";

describe("splitLegacyCertifications", () => {
  it("splits on commas, semicolons and newlines, trimming blanks", () => {
    expect(splitLegacyCertifications("PMP, CSM;  Leadership Academy\nOSHA 30,, ")).toEqual([
      { name: "PMP" },
      { name: "CSM" },
      { name: "Leadership Academy" },
      { name: "OSHA 30" },
    ]);
  });
  it("drops case-insensitive duplicates and handles empty input", () => {
    expect(splitLegacyCertifications("PMP, pmp, CSM")).toEqual([{ name: "PMP" }, { name: "CSM" }]);
    expect(splitLegacyCertifications("")).toEqual([]);
    expect(splitLegacyCertifications(undefined)).toEqual([]);
  });
});

describe("certificationsAnswer", () => {
  it("joins names back into the comma-separated answer form", () => {
    expect(certificationsAnswer([{ name: "PMP" }, { name: " CSM " }, { name: "" }])).toBe("PMP, CSM");
    expect(certificationsAnswer(undefined)).toBe("");
  });
});
