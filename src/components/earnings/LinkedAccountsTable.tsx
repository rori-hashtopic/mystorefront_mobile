import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePayoutAccounts } from "@/hooks/usePayoutAccounts";
import { LinkEftModal } from "./LinkEftModal";
import { ManageAccountModal } from "./ManageAccountModal";
import { motion } from "framer-motion";
import { Landmark, CheckCircle2, Link2 } from "lucide-react";

export function LinkedAccountsTable() {
  const { getAccountByType, linkEftAccount, unlinkAccount, loading } = usePayoutAccounts();

  const [eftModalOpen, setEftModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);

  const eftAccount = getAccountByType("EFT");

  const handleUpdateFromManage = () => {
    setManageModalOpen(false);
    setEftModalOpen(true);
  };

  const isActive = eftAccount && eftAccount.status === "active";

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 sm:space-y-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Payouts</p>
          <h2 className="font-display text-xl sm:text-2xl text-foreground">Linked Accounts</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your bank details are used for payouts only and will never be used to debit your account.
          </p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">EFT</p>
                {loading ? (
                  <p className="text-sm text-muted-foreground mt-0.5">Loading...</p>
                ) : isActive ? (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {eftAccount.bank_name} · {eftAccount.account_number_masked}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">No account linked</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isActive && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              )}
              {isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManageModalOpen(true)}
                  className="text-xs uppercase tracking-wide font-medium"
                >
                  Manage
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setEftModalOpen(true)}
                  className="text-xs uppercase tracking-wide font-medium"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Link Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <LinkEftModal open={eftModalOpen} onOpenChange={setEftModalOpen} onSubmit={linkEftAccount} />

      <ManageAccountModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
        account={eftAccount || null}
        onUnlink={unlinkAccount}
        onUpdate={handleUpdateFromManage}
      />
    </>
  );
}
