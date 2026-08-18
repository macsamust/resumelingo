import { describe, expect, it } from "vitest";
import { SubscriptionTier, LinkVisibility } from "../types";
import {
  assertActiveToggleAllowed,
  assertPhotoSizeOk,
  assertTemplateAllowed,
  assertVersionHistoryAllowed,
  assertVisibilityAllowed,
  ActiveToggleAccessError,
  PhotoTooLargeError,
  TemplateAccessError,
  VersionHistoryAccessError,
  VisibilityAccessError,
} from "./ResumeService";

/**
 * D1 counterpart to server/src/services/ResumeService.test.ts — same cases,
 * same expected outcomes, since these tier-gating rules are meant to behave
 * identically regardless of which backend enforces them. Kept as two
 * parallel files (not a shared test module) to match how the two
 * ResumeService implementations themselves are kept as parallel files
 * rather than one shared class.
 */
describe("assertTemplateAllowed", () => {
  it("allows a Basic template for every tier", () => {
    expect(() => assertTemplateAllowed(SubscriptionTier.Starter, "modern")).not.toThrow();
    expect(() => assertTemplateAllowed(SubscriptionTier.Professional, "modern")).not.toThrow();
    expect(() => assertTemplateAllowed(SubscriptionTier.Premium, "modern")).not.toThrow();
  });

  it("blocks a Premium template for Starter and Professional", () => {
    expect(() => assertTemplateAllowed(SubscriptionTier.Starter, "portrait")).toThrow(TemplateAccessError);
    expect(() => assertTemplateAllowed(SubscriptionTier.Professional, "portrait")).toThrow(TemplateAccessError);
  });

  it("allows a Premium template for Premium", () => {
    expect(() => assertTemplateAllowed(SubscriptionTier.Premium, "portrait")).not.toThrow();
  });

  it("blocks an Upgrade-tier template for Starter but allows Professional+", () => {
    expect(() => assertTemplateAllowed(SubscriptionTier.Starter, "executive")).toThrow(TemplateAccessError);
    expect(() => assertTemplateAllowed(SubscriptionTier.Professional, "executive")).not.toThrow();
    expect(() => assertTemplateAllowed(SubscriptionTier.Premium, "executive")).not.toThrow();
  });

  it("is a no-op for an unknown template key (existence isn't validated here)", () => {
    expect(() => assertTemplateAllowed(SubscriptionTier.Starter, "does-not-exist")).not.toThrow();
  });
});

describe("assertVisibilityAllowed", () => {
  it("allows Public for every tier", () => {
    expect(() => assertVisibilityAllowed(SubscriptionTier.Starter, LinkVisibility.Public)).not.toThrow();
    expect(() => assertVisibilityAllowed(SubscriptionTier.Premium, LinkVisibility.Public)).not.toThrow();
  });

  it("blocks Private for Starter but allows Professional and Premium", () => {
    expect(() => assertVisibilityAllowed(SubscriptionTier.Starter, LinkVisibility.Private)).toThrow(VisibilityAccessError);
    expect(() => assertVisibilityAllowed(SubscriptionTier.Professional, LinkVisibility.Private)).not.toThrow();
    expect(() => assertVisibilityAllowed(SubscriptionTier.Premium, LinkVisibility.Private)).not.toThrow();
  });

  it("blocks password-protected for everyone except Premium (not a strict rank ladder)", () => {
    expect(() => assertVisibilityAllowed(SubscriptionTier.Starter, LinkVisibility.PasswordProtected)).toThrow(
      VisibilityAccessError
    );
    expect(() => assertVisibilityAllowed(SubscriptionTier.Professional, LinkVisibility.PasswordProtected)).toThrow(
      VisibilityAccessError
    );
    expect(() => assertVisibilityAllowed(SubscriptionTier.Premium, LinkVisibility.PasswordProtected)).not.toThrow();
  });
});

describe("assertActiveToggleAllowed", () => {
  it("blocks Starter", () => {
    expect(() => assertActiveToggleAllowed(SubscriptionTier.Starter)).toThrow(ActiveToggleAccessError);
  });

  it("allows Professional and Premium", () => {
    expect(() => assertActiveToggleAllowed(SubscriptionTier.Professional)).not.toThrow();
    expect(() => assertActiveToggleAllowed(SubscriptionTier.Premium)).not.toThrow();
  });
});

describe("assertVersionHistoryAllowed", () => {
  it("blocks Starter", () => {
    expect(() => assertVersionHistoryAllowed(SubscriptionTier.Starter)).toThrow(VersionHistoryAccessError);
  });

  it("allows Professional and Premium", () => {
    expect(() => assertVersionHistoryAllowed(SubscriptionTier.Professional)).not.toThrow();
    expect(() => assertVersionHistoryAllowed(SubscriptionTier.Premium)).not.toThrow();
  });
});

describe("assertPhotoSizeOk", () => {
  it("allows undefined, empty, and reasonably small photos", () => {
    expect(() => assertPhotoSizeOk(undefined)).not.toThrow();
    expect(() => assertPhotoSizeOk("")).not.toThrow();
    expect(() => assertPhotoSizeOk("data:image/png;base64,abc123")).not.toThrow();
  });

  it("blocks a photo over the 2MB backstop", () => {
    const oversized = "a".repeat(2_000_001);
    expect(() => assertPhotoSizeOk(oversized)).toThrow(PhotoTooLargeError);
  });

  it("allows a photo exactly at the limit", () => {
    const atLimit = "a".repeat(2_000_000);
    expect(() => assertPhotoSizeOk(atLimit)).not.toThrow();
  });
});
