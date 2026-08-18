import { describe, expect, it } from "vitest";
import {
  buildResumeTextBlob,
  extractKeywords,
  isAtsSafeFamily,
  matchKeywords,
  runHealthChecks,
} from "./atsCheck";

describe("isAtsSafeFamily", () => {
  it("treats single-column families as ATS-safe", () => {
    expect(isAtsSafeFamily("minimal-clean")).toBe(true);
    expect(isAtsSafeFamily("centered-serif")).toBe(true);
  });

  it("treats sidebar/photo/grid families as not ATS-safe", () => {
    expect(isAtsSafeFamily("photo-banner-sidebar")).toBe(false);
  });
});

describe("extractKeywords", () => {
  it("ranks by frequency, most-mentioned first", () => {
    const result = extractKeywords("React React React TypeScript TypeScript GraphQL");
    expect(result.map((k) => k.word)).toEqual(["react", "typescript", "graphql"]);
    expect(result[0].count).toBe(3);
  });

  it("drops stopwords and words under 4 letters", () => {
    const result = extractKeywords("We are looking for a candidate with strong React and Go skills for the team");
    const words = result.map((k) => k.word);
    expect(words).not.toContain("the");
    expect(words).not.toContain("for");
    expect(words).not.toContain("candidate"); // explicit stopword
    expect(words).not.toContain("go"); // under 4 letters
    expect(words).toContain("react");
  });

  it("respects the max count", () => {
    const text = Array.from({ length: 30 }, (_, i) => `keyword${i}`).join(" ");
    expect(extractKeywords(text, 5)).toHaveLength(5);
  });
});

describe("matchKeywords", () => {
  it("splits job-description keywords into matched/missing based on the resume text", () => {
    const jd = "Looking for someone with React experience and strong TypeScript skills, plus GraphQL.";
    const resumeText = "Built dashboards using React and TypeScript for three years.";
    const result = matchKeywords(jd, resumeText);
    const matchedWords = result.matched.map((k) => k.word);
    const missingWords = result.missing.map((k) => k.word);
    expect(matchedWords).toContain("react");
    expect(matchedWords).toContain("typescript");
    expect(missingWords).toContain("graphql");
  });

  it("is case-insensitive", () => {
    const result = matchKeywords("REACT developer needed", "I have built apps with react for years");
    expect(result.matched.map((k) => k.word)).toContain("react");
    expect(result.missing).toHaveLength(0);
  });
});

describe("buildResumeTextBlob", () => {
  const baseInput = {
    title: "Software Engineer Resume",
    professionLabel: "Software Engineer",
    summary: "Experienced engineer.",
    bullets: ["Shipped a major feature."],
    experience: [],
    education: [],
    awards: [],
    achievements: [],
    answers: {},
  };

  it("includes skillsAndTools when provided (regression test — this was missing entirely before)", () => {
    const withoutSkills = buildResumeTextBlob(baseInput);
    expect(withoutSkills.toLowerCase()).not.toContain("kubernetes");

    const withSkills = buildResumeTextBlob({
      ...baseInput,
      skillsAndTools: [{ label: "Kubernetes" }, { label: "Terraform" }],
    });
    expect(withSkills.toLowerCase()).toContain("kubernetes");
    expect(withSkills.toLowerCase()).toContain("terraform");
  });

  it("omits skillsAndTools cleanly when not provided at all", () => {
    expect(() => buildResumeTextBlob(baseInput)).not.toThrow();
  });

  it("a skill already in Skills & Tools now counts as matched, not missing, against a job description", () => {
    const resumeText = buildResumeTextBlob({
      ...baseInput,
      skillsAndTools: [{ label: "Kubernetes" }],
    });
    const result = matchKeywords("We need someone experienced with Kubernetes deployments.", resumeText);
    expect(result.matched.map((k) => k.word)).toContain("kubernetes");
    expect(result.missing.map((k) => k.word)).not.toContain("kubernetes");
  });
});

describe("runHealthChecks", () => {
  const passingInput = {
    contactEmail: "jordan@example.com",
    contactPhone: "555-0100",
    templateFamily: "minimal-clean" as const,
    experience: [
      { company: "Acme", title: "Engineer", startDate: "2020-01", endDate: null, current: true },
    ],
    education: [
      { school: "State University", degree: "BS", fieldOfStudy: "CS", startDate: "2016-01", endDate: "2020-01", current: false },
    ],
    achievements: [{ challenge: "c", action: "a", result: "r" }],
    answers: { languages: "TypeScript, Python" },
    summary: "A results-driven engineer with a strong track record.",
  };

  it("scores 100 when every check passes", () => {
    const { score, items } = runHealthChecks(passingInput);
    expect(score).toBe(100);
    expect(items.every((i) => i.passed)).toBe(true);
  });

  it("flags a missing contact email and non-ATS-safe template, and lowers the score", () => {
    const { score, items } = runHealthChecks({
      ...passingInput,
      contactEmail: "",
      templateFamily: "photo-banner-sidebar",
    });
    expect(score).toBeLessThan(100);
    const email = items.find((i) => i.id === "email");
    const template = items.find((i) => i.id === "template");
    expect(email?.passed).toBe(false);
    expect(template?.passed).toBe(false);
  });

  it("scores 0 when nothing is filled in", () => {
    const { score } = runHealthChecks({
      contactEmail: "",
      contactPhone: "",
      templateFamily: "photo-banner-sidebar",
      experience: [],
      education: [],
      achievements: [],
      answers: {},
      summary: "",
    });
    expect(score).toBe(0);
  });
});
