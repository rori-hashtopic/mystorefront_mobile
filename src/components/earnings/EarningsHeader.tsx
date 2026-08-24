import { motion } from "framer-motion";
import { TIER_LABELS, normalizeTier, type TierKey } from "@/lib/creatorTiers";

interface EarningsHeaderProps {
  tier: TierKey;
}

const tierProgress: Record<string, { next: string; points: number }> = {
  enthusiast: { next: "Featured", points: 50 },
  ambassador: { next: "Tastemaker", points: 250 },
  trendsetter: { next: "", points: 0 },
};

export function EarningsHeader({ tier }: EarningsHeaderProps) {
  const activeTier = normalizeTier(tier);
  const tierInfo = tierProgress[activeTier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Earnings
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground">
            Your Earnings
          </h1>
          {tierInfo.next && (
            <p className="text-sm text-muted-foreground mt-3">
              {tierInfo.points} clicks milestone toward {tierInfo.next}
            </p>
          )}
        </div>
        <span className="shrink-0 mt-1 px-3 py-1 rounded-full border border-border text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {TIER_LABELS[activeTier]}
        </span>
      </div>
    </motion.div>
  );
}
