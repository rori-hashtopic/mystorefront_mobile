import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RequestPayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  activeAccountId: string;
  activeAccountLabel: string;
  onSubmit: (amount: number, accountId: string) => Promise<{ error: any }>;
  onSuccess: () => void;
}

const MIN_PAYOUT = 50;

export function RequestPayoutModal({
  open,
  onOpenChange,
  availableBalance,
  activeAccountId,
  activeAccountLabel,
  onSubmit,
  onSuccess,
}: RequestPayoutModalProps) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const numericAmount = parseFloat(amount);
  const isValid = !isNaN(numericAmount) && numericAmount >= MIN_PAYOUT && numericAmount <= availableBalance;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    const { error } = await onSubmit(numericAmount, activeAccountId);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit payout request.", variant: "destructive" });
    } else {
      toast({ title: "Payout Requested", description: `R${numericAmount.toFixed(2)} payout request submitted.` });
      setAmount("");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Withdraw your available balance to your linked account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-display text-foreground">R{availableBalance.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label>Payout To</Label>
            <p className="text-sm text-muted-foreground">{activeAccountLabel}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutAmount">Amount (ZAR)</Label>
            <Input
              id="payoutAmount"
              type="number"
              min={MIN_PAYOUT}
              max={availableBalance}
              step="0.01"
              placeholder={`Min R${MIN_PAYOUT}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum payout: R{MIN_PAYOUT}. Maximum: R{availableBalance.toFixed(2)}.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full"
          >
            {submitting ? "Submitting..." : `Request R${isValid ? numericAmount.toFixed(2) : "0.00"} Payout`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
