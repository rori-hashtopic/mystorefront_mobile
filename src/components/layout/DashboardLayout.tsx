import { ReactNode } from "react";
import { CreatorNavbar } from "./CreatorNavbar";
import { AppFooter } from "./AppFooter";
import type { TierKey } from "@/lib/creatorTiers";

interface DashboardLayoutProps {
  children: ReactNode;
  tier?: TierKey;
  displayName?: string;
  instagramConnected?: boolean;
  tiktokConnected?: boolean;
}

export function DashboardLayout({ children, tier, displayName, instagramConnected, tiktokConnected }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar tier={tier} displayName={displayName} instagramConnected={instagramConnected} tiktokConnected={tiktokConnected} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
