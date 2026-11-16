import { describe, expect, it } from "vitest";
import { AchievementGenerateError, AchievementGeneratorService } from "./AchievementGeneratorService";

function fakeAi(reply: unknown | (() => never)): Ai {
  return {
    run: async () => {
      if (typeof reply === "function") return (reply as () => never)();
      return { response: typeof reply === "string" ? reply : JSON.stringify(reply) };
    },
  } as unknown as Ai;
}

describe("AchievementGeneratorService.tighten", () => {
  const request = { professionLabel: "Product Manager", bullets: ["Was responsible for the roadmap", "Mentored 3 juniors"] };

  it("returns one rewritten bullet per input, in order", async () => {
    const service = new AchievementGeneratorService(fakeAi({ bullets: ["Owned the roadmap", "Mentored 3 junior PMs"] }));
    expect(await service.tighten(request)).toEqual(["Owned the roadmap", "Mentored 3 junior PMs"]);
  });

  it("keeps the original for any position the model skipped or blanked", async () => {
    const service = new AchievementGeneratorService(fakeAi({ bullets: ["Owned the roadmap", "   "] }));
    expect(await service.tighten(request)).toEqual(["Owned the roadmap", "Mentored 3 juniors"]);

    const short = new AchievementGeneratorService(fakeAi({ bullets: ["Owned the roadmap"] }));
    expect(await short.tighten(request)).toEqual(["Owned the roadmap", "Mentored 3 juniors"]);
  });

  it("does not call the AI for empty input", async () => {
    const service = new AchievementGeneratorService(fakeAi(() => { throw new Error("should not be called"); }));
    expect(await service.tighten({ professionLabel: "", bullets: [] })).toEqual([]);
  });

  it("wraps an AI failure in AchievementGenerateError", async () => {
    const service = new AchievementGeneratorService(fakeAi(() => { throw new Error("boom"); }));
    await expect(service.tighten(request)).rejects.toBeInstanceOf(AchievementGenerateError);
  });
});
