import { describe, expect, it } from "vitest";
import { ResumeImportService } from "./ResumeImportService";

function fakeAi(payload: unknown): Ai {
  return { run: async () => ({ response: JSON.stringify(payload) }) } as unknown as Ai;
}

describe("ResumeImportService caps", () => {
  it("keeps up to 40 achievements and reports how many were dropped", async () => {
    const achievements = Array.from({ length: 45 }, (_, i) => ({ action: `Did thing ${i + 1}`, challenge: "", result: "", company: "" }));
    const data = await new ResumeImportService(fakeAi({ experience: [], achievements })).extract("some resume text");
    expect(data.achievements).toHaveLength(40);
    expect(data.notes).toContain("Imported 40 of 45 achievement bullets. Add the rest on the Edit Resume page.");
  });

  it("adds no cap note when everything fits", async () => {
    const achievements = Array.from({ length: 25 }, (_, i) => ({ action: `Did thing ${i + 1}` }));
    const data = await new ResumeImportService(fakeAi({ achievements })).extract("some resume text");
    expect(data.achievements).toHaveLength(25);
    expect(data.notes).toEqual([]);
  });
});
