interface DemoTierBannerProps {
  tier: "free" | "paid";
}

export function DemoTierBanner({ tier }: DemoTierBannerProps) {
  if (tier === "free") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs">
        <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white">
          FREE
        </span>
        <span className="text-emerald-800">
          <strong className="font-semibold">Included in your Affiliate tool subscription</strong>
          <span className="text-emerald-700"> — no upgrade needed.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
      <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold tracking-wider text-background">
        PRO
      </span>
      <span className="text-foreground">
        <strong className="font-semibold">Premium plan feature</strong>
        <span className="text-muted-foreground">
          {" "}— available on the paid plan. The free Affiliate tool subscription includes Analytics and Payments only.
        </span>
      </span>
    </div>
  );
}
