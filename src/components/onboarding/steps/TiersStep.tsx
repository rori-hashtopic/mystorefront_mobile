import { Check, Lock } from "lucide-react";

interface TiersStepProps {
  currentTier: "enthusiast" | "ambassador" | "trendsetter" | "icon";
  completedSteps: {
    bioAdded: boolean;
    socialLinked: boolean;
    photoUploaded: boolean;
  };
  marketingConsent: boolean;
  onMarketingConsentChange: (value: boolean) => void;
  tosAccepted: boolean;
  onTosAcceptedChange: (value: boolean) => void;
}

const TIERS = [
  { id: "enthusiast", name: "Insider" },
  { id: "ambassador", name: "Featured" },
  { id: "trendsetter", name: "Tastemaker" },
  { id: "icon", name: "Muse" },
];

const TIER_BENEFITS = {
  enthusiast: ["Create affiliate links", "Track your earnings", "Custom storefront URL"],
  ambassador: ["Priority brand partnerships", "Higher commission rates", "Early access to campaigns"],
  trendsetter: ["Exclusive brand deals", "Custom storefront themes", "Analytics dashboard"],
  icon: ["VIP brand collaborations", "Dedicated account manager", "Premium features"],
} as const;

const UPGRADE_TIPS = [
  "Generate your first product link",
  "Create your first collection",
  "Drive 50 clicks to your links",
  "Refer 10 creators",
];

export function TiersStep({
  currentTier,
  completedSteps,
  marketingConsent,
  onMarketingConsentChange,
  tosAccepted,
  onTosAcceptedChange,
}: TiersStepProps) {
  const tierIndex = TIERS.findIndex((t) => t.id === currentTier);

  return (
    <div>
      {/* Tier progress — mobile-safe with relative container */}
      <div className="relative flex items-start mb-5">
        {/* Connector line behind circles */}
        <div className="absolute top-4 left-0 right-0 h-px bg-border" />
        {TIERS.map((tier, i) => (
          <div key={tier.id} className="flex-1 flex flex-col items-center relative">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold tracking-wide z-10 ${
                i <= tierIndex
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-[9px] uppercase tracking-[0.12em] mt-1.5 text-center leading-tight ${
                i <= tierIndex ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {tier.name}
            </span>
          </div>
        ))}
      </div>

      {/* Insider Benefits — shown prominently */}
      <div className="mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
          {TIERS[tierIndex]?.name} Benefits
        </span>
        <div className="space-y-2">
          {TIER_BENEFITS[currentTier]?.map((benefit, i) => (
            <div key={i} className="flex items-center gap-3">
              <Check className="h-3 w-3 text-foreground flex-shrink-0" />
              <span className="text-sm text-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Milestones */}
      <div className="mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
          Featured Milestones
        </span>
        <div className="space-y-2">
          {UPGRADE_TIPS.map((tip, i) => (
            <div key={i} className="flex items-center gap-3">
              <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border my-4" />

      {/* ToS confirmation */}
      <button
        type="button"
        onClick={() => onTosAcceptedChange(!tosAccepted)}
        className="flex items-start gap-3 w-full text-left group mb-3"
      >
        <div
          className={`mt-0.5 w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
            tosAccepted ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground/50"
          }`}
        >
          {tosAccepted && (
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
        <p className="text-sm text-muted-foreground leading-snug">
          I confirm that I am at least 18 years old and have read and agree to the MyStorefront{" "}
          <span className="underline">Terms of Service</span>, <span className="underline">Privacy Policy</span> and{" "}
          <span className="underline">Cookie Notice</span>.
        </p>
      </button>

      {/* Marketing opt-in */}
      <button
        type="button"
        onClick={() => onMarketingConsentChange(!marketingConsent)}
        className="flex items-start gap-3 w-full text-left group"
      >
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
          <p className="text-xs text-muted-foreground/60 mt-0.5">You can unsubscribe at any time.</p>
        </div>
      </button>
    </div>
  );
}
