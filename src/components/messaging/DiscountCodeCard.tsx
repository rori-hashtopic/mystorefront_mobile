import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Check, Loader2, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DiscountCodeData } from "@/hooks/useMessages";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DiscountCodeCardProps {
  data: DiscountCodeData;
  isMe: boolean;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: DiscountCodeData) => Promise<any>;
}

export function DiscountCodeCard({ data, isMe, isBrand, messageId, onUpdate }: DiscountCodeCardProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card
        className={`border cursor-pointer hover:shadow-md transition-shadow ${isMe ? "border-foreground/20" : "border-border"}`}
        onClick={() => setShowModal(true)}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Discount Code</span>
            </div>
            <Badge className={data.status === "acknowledged" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} >
              {data.status === "acknowledged" ? "Acknowledged" : "New"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg text-foreground">{data.code}</span>
            <span className="text-sm text-muted-foreground">
              {data.discount_type === "percentage"
                ? `${data.discount_value}% off`
                : `R${Number(data.discount_value).toFixed(2)} off`}
            </span>
          </div>
          <p className="text-[10px] text-primary">Click to view details</p>
        </CardContent>
      </Card>

      <DiscountCodeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        data={data}
        isBrand={isBrand}
        messageId={messageId}
        onUpdate={onUpdate}
      />
    </>
  );
}

function DiscountCodeModal({
  open, onClose, data, isBrand, messageId, onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  data: DiscountCodeData;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: DiscountCodeData) => Promise<any>;
}) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleAcknowledge = async () => {
    setUpdating(true);
    await onUpdate(messageId, {
      ...data,
      status: "acknowledged",
      status_updated_at: new Date().toISOString(),
    });
    setUpdating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.code);
    toast({ title: "Copied!", description: `Code "${data.code}" copied to clipboard.` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Discount Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="font-mono font-bold text-2xl text-foreground tracking-wider">{data.code}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {data.discount_type === "percentage"
                ? `${data.discount_value}% off`
                : `R${Number(data.discount_value).toFixed(2)} off`}
            </p>
            {data.expiry_date && (
              <p className="text-xs text-muted-foreground mt-1">Expires: {data.expiry_date}</p>
            )}
          </div>

          {data.notes && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{data.notes}</p>
            </div>
          )}

          {!isBrand && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy Code
              </Button>
              {data.status !== "acknowledged" && (
                <Button size="sm" className="flex-1" onClick={handleAcknowledge} disabled={updating}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Acknowledge
                </Button>
              )}
            </div>
          )}

          {data.status_updated_at && (
            <p className="text-[10px] text-muted-foreground text-right">
              Updated {formatDistanceToNow(new Date(data.status_updated_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
