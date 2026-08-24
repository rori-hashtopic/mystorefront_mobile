import { useEffect, useState } from "react";
import { Check, ChevronDown, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TIER_LABELS, normalizeTier, type ActiveTierKey, type TierKey } from "@/lib/creatorTiers";

const NEXT_TIER: Record<ActiveTierKey, string | null> = {
  enthusiast: "Featured",
  ambassador: "Tastemaker",
  trendsetter: null,
};

const TIER_BENEFITS: Record<ActiveTierKey, string[]> = {
  enthusiast: ["Create affiliate links", "Track your earnings", "Custom storefront URL"],
  ambassador: [
    "Access to discount codes",
    "Receive gifting from brands",
    "Guaranteed brand mentions",
    "Direct messages from brands",
  ],
  trendsetter: [
    "Tastemaker creator badge",
    "Priority consideration for collaborations",
    "Request gifting and discount codes from brands",
    "Request to message brands",
    "Listed as a top creator for brand gifting and campaigns",
  ],
};

type TierMetrics = {
  linkCount: number;
  collectionCount: number;
  totalClicks: number;
  referralCount: number;
  hasActivityStreak: boolean;
};

function getTierProgress(tier: TierKey, metrics: TierMetrics) {
  const activeTier = normalizeTier(tier);

  // Milestones describe what's needed to reach the NEXT tier.
  const nextTierMilestones: Record<ActiveTierKey, { label: string; done: boolean }[]> = {
    enthusiast: [
      { label: "Generate your first product link", done: metrics.linkCount >= 1 },
      { label: "Create your first collection", done: metrics.collectionCount >= 1 },
      { label: "Drive 50 clicks to your links", done: metrics.totalClicks >= 50 },
      { label: `Creator referrals: ${metrics.referralCount} / 10 accepted`, done: metrics.referralCount >= 10 },
    ],
    ambassador: [
      { label: "Drive 250 clicks to your links", done: metrics.totalClicks >= 250 },
      { label: `Creator referrals: ${metrics.referralCount} / 20 accepted`, done: metrics.referralCount >= 20 },
      { label: "Maintain a 30-day activity streak", done: metrics.hasActivityStreak },
    ],
    trendsetter: [],
  };

  const actions = nextTierMilestones[activeTier];
  const completedActions = actions.filter((action) => action.done).length;
  const progress = actions.length === 0 ? 100 : Math.round((completedActions / actions.length) * 100);

  return {
    next: NEXT_TIER[activeTier],
    progress,
    actions,
    benefits: TIER_BENEFITS[activeTier],
  };
}

interface TierProgressPanelProps {
  tier?: TierKey;
  className?: string;
  compactExpandable?: boolean;
}

export function TierProgressPanel({ tier, className = "", compactExpandable = false }: TierProgressPanelProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<TierMetrics>({
    linkCount: 0,
    collectionCount: 0,
    totalClicks: 0,
    referralCount: 0,
    hasActivityStreak: false,
  });

  useEffect(() => {
    if (!user) return;

    const fetchTierMetrics = async () => {
      const [linksResult, collectionsResult, referralResult] = await Promise.all([
        supabase.rpc("get_own_links"),
        supabase.from("collections").select("id").eq("user_id", user.id).eq("is_archived", false),
        supabase.rpc("get_creator_referral_stats" as any, { p_user_id: user.id }),
      ]);

      const links = linksResult.data ?? [];
      const referralStats = Array.isArray(referralResult.data) ? referralResult.data[0] : referralResult.data;
      setMetrics({
        linkCount: links.length,
        collectionCount: collectionsResult.data?.length ?? 0,
        totalClicks: links.reduce((sum, link) => sum + Number(link.clicks || 0), 0),
        referralCount: Number((referralStats as any)?.accepted_count || 0),
        hasActivityStreak: false,
      });
    };

    fetchTierMetrics();
  }, [user]);

  if (!tier) return null;

  const tierInfo = getTierProgress(tier, metrics);
  const activeTier = normalizeTier(tier);
  const isTopTier = !tierInfo.next;
  const pendingActions = tierInfo.actions.filter((action) => !action.done);

  if (compactExpandable) {
    return (
      <div className={`space-y-3 ${className}`}>
        <button
          type="button"
          className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-xl leading-none text-foreground">{TIER_LABELS[activeTier]}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {isTopTier ? "Top tier" : `${tierInfo.progress}% to ${tierInfo.next}`}
              <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </span>
          </div>
          {!isTopTier && (
            <div className="mt-3 h-px w-full bg-border overflow-hidden">
              <div className="h-full bg-foreground transition-all" style={{ width: `${tierInfo.progress}%` }} />
            </div>
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-border pt-3">
            {isTopTier ? (
              <p className="text-sm leading-snug text-foreground">You've reached the top tier.</p>
            ) : (
              <>
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Up next: {tierInfo.next}
                </p>
                <div className="space-y-2.5">
                  {(pendingActions.length ? pendingActions : tierInfo.actions).map((action) => (
                    <div key={action.label} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
                      {action.done ? (
                        <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>{action.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Current tier</p>
        <div className="flex items-end justify-between gap-4">
          <p className="font-display text-2xl text-foreground">{TIER_LABELS[activeTier]}</p>
          {isTopTier ? (
            <p className="text-xs text-muted-foreground">Top tier</p>
          ) : (
            <p className="text-xs text-muted-foreground">Next: {tierInfo.next}</p>
          )}
        </div>
      </div>

      {!isTopTier && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress to {tierInfo.next}</span>
            <span>{tierInfo.progress}%</span>
          </div>
          <div className="h-px w-full bg-border">
            <div className="h-px bg-foreground" style={{ width: `${tierInfo.progress}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {isTopTier ? "Milestones" : `Milestones to ${tierInfo.next}`}
        </p>
        {isTopTier ? (
          <p className="text-sm text-foreground">You've reached the top tier.</p>
        ) : (
          <div className="space-y-2.5">
            {tierInfo.actions.map((action) => (
              <div key={action.label} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check
                  className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${action.done ? "text-foreground" : "text-muted-foreground/40"}`}
                />
                <span className={action.done ? "text-foreground" : "text-muted-foreground"}>{action.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTier !== "ambassador" && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Benefits unlocked</p>
          <div className="space-y-2.5">
            {tierInfo.benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
