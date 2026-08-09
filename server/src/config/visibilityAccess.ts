import { LinkVisibility, SubscriptionTier } from "../types";

/**
 * Which link visibilities each subscription tier can use. Unlike template
 * categories (config/templates.ts), this isn't a strict rank ladder —
 * Professional skips straight from Public to Private without unlocking
 * Password, then Premium unlocks all three — so it's an explicit allow-list
 * rather than a >= rank comparison.
 */
export const TIER_ALLOWED_VISIBILITY: Record<SubscriptionTier, LinkVisibility[]> = {
  [SubscriptionTier.Starter]: [LinkVisibility.Public],
  [SubscriptionTier.Professional]: [LinkVisibility.Public, LinkVisibility.Private],
  [SubscriptionTier.Premium]: [LinkVisibility.Public, LinkVisibility.Private, LinkVisibility.PasswordProtected],
};

/** The cheapest subscription tier that can use this visibility — used for "Upgrade to X" messaging. */
export const VISIBILITY_MIN_TIER: Record<LinkVisibility, SubscriptionTier> = {
  [LinkVisibility.Public]: SubscriptionTier.Starter,
  [LinkVisibility.Private]: SubscriptionTier.Professional,
  [LinkVisibility.PasswordProtected]: SubscriptionTier.Premium,
};

export const VISIBILITY_LABEL: Record<LinkVisibility, string> = {
  [LinkVisibility.Public]: "Public",
  [LinkVisibility.Private]: "Private",
  [LinkVisibility.PasswordProtected]: "Password-protected",
};

/** Whether a subscriber at `tier` is allowed to select/keep a resume link set to `visibility`. */
export function canUseVisibility(tier: SubscriptionTier, visibility: LinkVisibility): boolean {
  return TIER_ALLOWED_VISIBILITY[tier].includes(visibility);
}
