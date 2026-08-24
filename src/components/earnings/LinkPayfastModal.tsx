import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface LinkPayfastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    merchantId: string;
    merchantKey: string;
    passphrase?: string;
  }) => Promise<{ error: any }>;
}

export function LinkPayfastModal({
  open,
  onOpenChange,
  onSubmit,
}: LinkPayfastModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    merchantId: "",
    merchantKey: "",
    passphrase: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.merchantId) newErrors.merchantId = "Merchant ID is required";
    if (!formData.merchantKey) newErrors.merchantKey = "Merchant Key is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await onSubmit({
      merchantId: formData.merchantId,
      merchantKey: formData.merchantKey,
      passphrase: formData.passphrase || undefined,
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to connect PayFast. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "PayFast account connected successfully.",
      });
      onOpenChange(false);
      setFormData({
        merchantId: "",
        merchantKey: "",
        passphrase: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Connect PayFast
          </DialogTitle>
          <DialogDescription>
            Enter your PayFast merchant credentials to enable PayFast payouts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="merchantId">Merchant ID</Label>
            <Input
              id="merchantId"
              value={formData.merchantId}
              onChange={(e) =>
                setFormData({ ...formData, merchantId: e.target.value })
              }
              placeholder="Your PayFast Merchant ID"
            />
            {errors.merchantId && (
              <p className="text-sm text-destructive">{errors.merchantId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantKey">Merchant Key</Label>
            <Input
              id="merchantKey"
              type="password"
              value={formData.merchantKey}
              onChange={(e) =>
                setFormData({ ...formData, merchantKey: e.target.value })
              }
              placeholder="Your PayFast Merchant Key"
            />
            {errors.merchantKey && (
              <p className="text-sm text-destructive">{errors.merchantKey}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">
              Passphrase <span className="text-muted-foreground">(optional, recommended)</span>
            </Label>
            <Input
              id="passphrase"
              type="password"
              value={formData.passphrase}
              onChange={(e) =>
                setFormData({ ...formData, passphrase: e.target.value })
              }
              placeholder="Your PayFast passphrase"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Connecting..." : "Connect PayFast"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
