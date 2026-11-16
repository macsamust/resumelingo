import { describe, expect, it } from "vitest";
import { parseBullets } from "./parseBullets";

describe("parseBullets", () => {
  it("strips mixed bullet markers and numbering", () => {
    const r = parseBullets("• One\n- Two\n* Three\n2) Four\n3. Five");
    expect(r.bullets).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });

  it("joins wrapped continuation lines (indented or lowercase)", () => {
    const r = parseBullets("• Introduced weekly customer interviews, informing\n  9 shipped features\n• Next bullet");
    expect(r.bullets).toEqual(["Introduced weekly customer interviews, informing 9 shipped features", "Next bullet"]);
    expect(r.joined).toBe(1);
  });

  it("treats plain lines as separate bullets and a blank line as a break", () => {
    const r = parseBullets("Led the migration\nMentored 3 engineers\n\nlowercase after blank starts fresh");
    expect(r.bullets).toEqual(["Led the migration", "Mentored 3 engineers", "lowercase after blank starts fresh"]);
  });

  it("skips duplicates within the paste and against existing bullets", () => {
    const r = parseBullets("- Owned the roadmap.\n- owned the  roadmap\n- New one", ["Owned the roadmap"]);
    expect(r.bullets).toEqual(["New one"]);
    expect(r.skipped).toBe(2);
  });

  it("ignores empty input", () => {
    expect(parseBullets("  \n\n").bullets).toEqual([]);
  });
});
