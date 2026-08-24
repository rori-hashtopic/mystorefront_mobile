interface TierBannerProps {
  tier: "free" | "premium";
}

/**
 * Tier badges have been removed from the brand UI. This component is
 * intentionally a no-op so existing usages stay valid without rendering
 * any "FREE" / "PRO" / "Premium plan feature" tags.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TierBanner(_props: TierBannerProps) {
  return null;
}
