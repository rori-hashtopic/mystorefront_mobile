import { Lock, ArrowRight } from "lucide-react";

interface GetStartedStepProps {
  selectedAction: string;
  onSelect: (action: string) => void;
  currentTier: "enthusiast" | "ambassador" | "trendsetter" | "icon";
  marketingConsent: boolean;
  onMarketingConsentChange: (value: boolean) => void;
}

const ACTIONS = [
  {
    id: "create-link",
    label: "Create a commissionable link",
    description: "Start earning by sharing your favorite products",
    minTier: "enthusiast",
    minTierLabel: "Insider",
  },
  {
    id: "create-list",
    label: "Create a List",
    description: "Curate a collection of products for your audience",
    minTier: "enthusiast",
    minTierLabel: "Insider",
  },
  {
    id: "shoppable-post",
    label: "Create a shoppable social post",
    description: "Turn your content into shopping experiences",
    minTier: "ambassador",
    minTierLabel: "Featured",
  },
];

const TIER_ORDER = ["enthusiast", "ambassador", "trendsetter", "icon"];

export function GetStartedStep({
  selectedAction,
  onSelect,
  currentTier,
  marketingConsent,
  onMarketingConsentChange,
}: GetStartedStepProps) {
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  const isLocked = (minTier: string) => {
    const minTierIndex = TIER_ORDER.indexOf(minTier);
    return currentTierIndex < minTierIndex;
  };

  return (
    <div>
      <h2 className="font-display text-3xl text-foreground mb-2">Let's Get Started</h2>
      <p className="text-muted-foreground text-sm mb-6">What would you like to do first?</p>

      <div className="space-y-0">
        {ACTIONS.map((action) => {
          const locked = isLocked(action.minTier);
          const selected = selectedAction === action.id && !locked;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => !locked && onSelect(action.id)}
              disabled={locked}
              className={`w-full text-left py-4 border-b border-border transition-all duration-200 group ${
                locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              } ${selected ? "bg-accent/50 -mx-4 px-4 border-foreground/20" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {/* Selection indicator */}
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        selected ? "bg-foreground" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      } transition-colors`}
                    >
                      {action.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-[18px]">{action.description}</p>
                </div>
                {locked ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-wide">{action.minTierLabel}</span>
                  </div>
                ) : (
                  <ArrowRight
                    className={`h-3 w-3 mt-0.5 transition-all ${
                      selected
                        ? "text-foreground opacity-100"
                        : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-6 mb-6 text-center">
        Some features unlock as you level up
      </p>

      {/* Marketing opt-in */}
      <div className="border-t border-border pt-5">
        <button
          type="button"
          onClick={() => onMarketingConsentChange(!marketingConsent)}
          className="flex items-start gap-3 w-full text-left group"
        >
          {/* Custom checkbox */}
          <div
            className={`mt-0.5 w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
              marketingConsent ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground/50"
            }`}
          >
            {marketingConsent && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground leading-snug">
              Send me tips, platform updates, and brand opportunity alerts.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">You can unsubscribe at any time.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
