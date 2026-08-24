import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { useProfile } from "@/hooks/useProfile";
import { EarningsHeader } from "@/components/earnings/EarningsHeader";
import { CommissionsPayoutsTable } from "@/components/earnings/CommissionsPayoutsTable";
import { OpportunityPaymentsTable } from "@/components/earnings/OpportunityPaymentsTable";

import { BalanceCard } from "@/components/earnings/BalanceCard";
import { AppFooter } from "@/components/layout/AppFooter";
import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { hasTierAccess } from "@/lib/creatorTiers";

export default function Earnings() {
  const { profile } = useProfile();

  const tier = profile?.tier || "enthusiast";
  const displayName = profile?.display_name;
  const showBrandPayments = hasTierAccess(tier, "ambassador");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar
        tier={tier}
        displayName={displayName}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-10 sm:space-y-12"
        >
          <EarningsHeader tier={tier} />
          <BalanceCard />
          <div className="h-px bg-border" />
          <CommissionsPayoutsTable />
          {showBrandPayments && (
            <>
              <div className="h-px bg-border" />
              <OpportunityPaymentsTable tier={tier} />
            </>
          )}
          <div className="h-px bg-border" />

          {/* Payout note */}
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Payouts</p>
              <h2 className="font-display text-xl sm:text-2xl text-foreground">Bank Details</h2>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <Landmark className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Payouts are processed automatically on the 1st of each month via EFT to your registered bank account.
                Ensure your banking details are up to date in{" "}
                <Link to="/settings" className="underline text-foreground font-medium hover:text-foreground/80">
                  profile settings
                </Link>
                .
              </p>
            </div>
          </section>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
