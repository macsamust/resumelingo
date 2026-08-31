import { LinkVisibility, SubscriptionTier } from "../types";

/**
 * Which link visibilities each subscription tier can use. Unlike template
 * categories (templateAccess.ts), this isn't a strict rank ladder —
 * Professional skips straight from Public to Private without unlocking
 * Password, then Premium unlocks all three — so it's an explicit allow-list
 * rather than a >= rank comparison. Mirrored server-side in
 * server/src/config/visibilityAccess.ts, which is the actual source of truth.
 */
export const TIER_ALLOWED_VISIBILITY: Record<SubscriptionTier, LinkVisibility[]> = {
  starter: ["public"],
  professional: ["public", "private"],
  premium: ["public", "private", "password"],
};

/** The cheapest subscription tier that can use this visibility — used for "Upgrade to X" messaging. */
export const VISIBILITY_MIN_TIER: Record<LinkVisibility, SubscriptionTier> = {
  public: "starter",
  private: "professional",
  password: "premium",
};

export const VISIBILITY_LABEL: Record<LinkVisibility, string> = {
  public: "Public, anyone with the link",
  private: "Private, owner only",
  password: "Password protected",
};

/** Whether a subscriber at `tier` is allowed to select/keep a resume link set to `visibility`. */
export function canUseVisibility(tier: SubscriptionTier, visibility: LinkVisibility): boolean {
  return TIER_ALLOWED_VISIBILITY[tier].includes(visibility);
}
