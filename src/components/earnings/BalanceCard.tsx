import { motion } from "framer-motion";
import { useCreatorBalance } from "@/hooks/useCreatorBalance";
import { usePayoutAccounts } from "@/hooks/usePayoutAccounts";
import { CalendarClock, Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { format, addMonths } from "date-fns";

export function BalanceCard() {
  const { balance, loading: balanceLoading } = useCreatorBalance();
  const { accounts, hasActiveAccount, loading: accountsLoading } = usePayoutAccounts();

  const loading = balanceLoading || accountsLoading;

  // MyStorefront takes a 20% platform fee; creators see their net (80%) earnings.
  const PLATFORM_FEE = 0.2;
  const grossTotalEarned = balance?.total_earned ?? 0;
  const grossLockedAmount = balance?.locked_amount ?? 0;
  const grossPaidAmount = balance?.paid_amount ?? 0;
  const grossAvailableBalance = balance?.available_balance ?? 0;

  const totalEarned = Math.max(grossTotalEarned * (1 - PLATFORM_FEE), 0);
  // paid_amount is already the net value the creator received.
  const paidAmount = Math.max(grossPaidAmount, 0);
  // Recalculate net available balance from gross locked - committed payouts.
  const availableBalance = Math.max(grossAvailableBalance - grossLockedAmount * PLATFORM_FEE, 0);

  // Next payout is the 1st of next month
  const now = new Date();
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Balance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-8">
          <BalanceMetric label="Total Earned" value={loading ? "–" : `R${totalEarned.toFixed(2)}`} index={1} />
          <BalanceMetric label="Paid Out" value={loading ? "–" : `R${paidAmount.toFixed(2)}`} index={2} />
          <BalanceMetric
            label="Next Payout"
            value={loading ? "–" : `R${availableBalance.toFixed(2)}`}
            index={3}
            highlight
            subtext={
              loading
                ? undefined
                : availableBalance >= 50
                  ? format(nextPayoutDate, "dd MMM yyyy")
                  : availableBalance > 0
                    ? "Min R50 not met"
                    : undefined
            }
          />
        </div>

        {/* Automated Payout Info */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
            <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">Automatic monthly payouts</p>
              <p className="text-sm text-muted-foreground">
                Earnings that have cleared the refund buffer are automatically paid out on the 1st of each month via
                EFT.
              </p>
              {!hasActiveAccount && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  <Landmark className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                  No bank account linked.{" "}
                  <Link to="/settings" className="underline font-medium hover:opacity-80">
                    Add your banking details
                  </Link>{" "}
                  to receive payouts.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function BalanceMetric({
  label,
  value,
  index,
  highlight,
  subtext,
}: {
  label: string;
  value: string;
  index: number;
  highlight?: boolean;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="py-4 sm:py-6 border-b border-border flex items-baseline justify-between sm:block"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground sm:mb-3">{label}</p>
      <div className="text-right sm:text-left">
        <p className={`text-2xl sm:text-3xl font-display ${highlight ? "text-foreground" : "text-foreground/80"}`}>
          {value}
        </p>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}
