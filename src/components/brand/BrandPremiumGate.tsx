import { ReactNode } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useBrandAccount } from "@/hooks/useBrandAccount";
import { Loader2 } from "lucide-react";

interface BrandPremiumGateProps {
  /** Title shown on the lock screen, e.g. "Creators" */
  pageTitle: string;
  /** One-line pitch shown above the lock card */
  pageSubtitle?: string;
  children: ReactNode;
}

/**
 * Wraps a premium brand page. If the brand is on the free plan, we show a
 * lock screen instead of the real content. If they're on premium, children
 * render normally with no extra chrome.
 */
export function BrandPremiumGate({ pageTitle, pageSubtitle, children }: BrandPremiumGateProps) {
  const { brand, loading } = useBrandAccount();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (brand?.plan_tier === "premium") {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">{pageTitle}</h1>
        {pageSubtitle && <p className="text-muted-foreground">{pageSubtitle}</p>}
      </div>
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-foreground" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
            {pageTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Upgrade to unlock {pageTitle.toLowerCase()} and the rest of the brand toolkit.
          </p>
          <Button onClick={() => (window.location.href = "mailto:hello@mystorefront.io?subject=Upgrade")}>
            Upgrade
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
