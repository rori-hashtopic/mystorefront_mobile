import { Copy } from "lucide-react";

interface ShopQuickActionsProps {
  onShareClick: () => void;
  onCopyReferralLink?: () => void;
}

export function ShopQuickActions({ onCopyReferralLink }: ShopQuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 mb-4">
      {onCopyReferralLink && (
        <button
          onClick={onCopyReferralLink}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="border-b border-transparent group-hover:border-current">Copy referral link</span>
        </button>
      )}
    </div>
  );
}
