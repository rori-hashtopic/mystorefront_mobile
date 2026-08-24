export type TierKey = "enthusiast" | "ambassador" | "trendsetter" | "icon";
export type ActiveTierKey = "enthusiast" | "ambassador" | "trendsetter";

export const TIER_ORDER = ["enthusiast", "ambassador", "trendsetter"] as const;

export const TIER_LABELS: Record<TierKey, string> = {
  enthusiast: "Insider",
  ambassador: "Featured",
  trendsetter: "Tastemaker",
  icon: "Tastemaker",
};

export function normalizeTier(tier?: string | null): ActiveTierKey {
  if (tier === "ambassador" || tier === "trendsetter") return tier;
  if (tier === "icon") return "trendsetter";
  return "enthusiast";
}

export function hasTierAccess(currentTier: string, requiredTier: string): boolean {
  return TIER_ORDER.indexOf(normalizeTier(currentTier)) >= TIER_ORDER.indexOf(normalizeTier(requiredTier));
}