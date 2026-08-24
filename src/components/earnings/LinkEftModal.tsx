import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BANKS = ["ABSA", "Capitec", "FNB", "Nedbank", "Standard Bank", "TymeBank", "Discovery Bank", "Investec", "Other"];

interface LinkEftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    accountType: string;
    branchCode: string;
  }) => Promise<{ error: any }>;
}

export function LinkEftModal({ open, onOpenChange, onSubmit }: LinkEftModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bankName) newErrors.bankName = "Bank name is required";
    if (!formData.accountHolder) newErrors.accountHolder = "Account holder is required";
    if (!formData.accountNumber) {
      newErrors.accountNumber = "Account number is required";
    } else if (!/^\d+$/.test(formData.accountNumber)) {
      newErrors.accountNumber = "Account number must be numeric";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await onSubmit({
      ...formData,
      accountType: "",
      branchCode: "",
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to link bank account. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Bank account linked successfully.",
      });
      onOpenChange(false);
      setFormData({
        bankName: "",
        accountHolder: "",
        accountNumber: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Link Bank Account (EFT)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Select value={formData.bankName} onValueChange={(value) => setFormData({ ...formData, bankName: value })}>
              <SelectTrigger id="bankName">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bankName && <p className="text-sm text-destructive">{errors.bankName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolder">Account Holder Name</Label>
            <Input
              id="accountHolder"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              placeholder="Full name as on account"
            />
            {errors.accountHolder && <p className="text-sm text-destructive">{errors.accountHolder}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Enter account number"
            />
            {errors.accountNumber && <p className="text-sm text-destructive">{errors.accountNumber}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Linking..." : "Link Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
