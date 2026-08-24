import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PayoutAccount, PayoutAccountType } from "@/hooks/usePayoutAccounts";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ManageAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PayoutAccount | null;
  onUnlink: (type: PayoutAccountType) => Promise<{ error: any }>;
  onUpdate: () => void;
}

export function ManageAccountModal({
  open,
  onOpenChange,
  account,
  onUnlink,
  onUpdate,
}: ManageAccountModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!account) return null;

  const handleUnlink = async () => {
    setLoading(true);
    const { error } = await onUnlink(account.type);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unlink account. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account unlinked successfully.",
      });
      onOpenChange(false);
    }
  };

  const isEft = account.type === "EFT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Manage {isEft ? "EFT" : "PayFast"} Account
          </DialogTitle>
          <DialogDescription>
            View and manage your linked payout account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="rounded-lg border p-4 space-y-2">
            {isEft ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{account.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Holder</span>
                  <span className="font-medium">{account.account_holder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-medium">{account.account_number_masked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Type</span>
                  <span className="font-medium">{account.account_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch Code</span>
                  <span className="font-medium">{account.branch_code}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Merchant ID</span>
                  <span className="font-medium">{account.merchant_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passphrase</span>
                  <span className="font-medium">
                    {account.passphrase_set ? "Set" : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{account.status}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onUpdate}>
              Update Details
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={loading}
            >
              {loading ? "Unlinking..." : "Unlink Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
