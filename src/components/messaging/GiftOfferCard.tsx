import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Gift, Check, X, Loader2, Package, Truck, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { GiftOfferData, GiftOfferStatus } from "@/hooks/useMessages";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<GiftOfferStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
  shipped: { label: "Shipped", color: "bg-violet-100 text-violet-700" },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  posted: { label: "Posted", color: "bg-teal-100 text-teal-700" },
};

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

interface GiftOfferCardProps {
  data: GiftOfferData;
  isMe: boolean;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: GiftOfferData) => Promise<any>;
}

export function GiftOfferCard({ data, isMe, isBrand, messageId, onUpdate }: GiftOfferCardProps) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[data.status];

  return (
    <>
      <Card
        className={`border cursor-pointer hover:shadow-md transition-shadow ${isMe ? "border-foreground/20" : "border-border"}`}
        onClick={() => setShowModal(true)}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Gift Offer</span>
            </div>
            <Badge className={`${config.color} text-[10px]`}>{config.label}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {data.product_image_url && (
              <img src={data.product_image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div>
              <h4 className="font-medium text-foreground text-sm">{data.product_name}</h4>
              {data.product_value && (
                <p className="text-xs text-muted-foreground">Value: {ZAR.format(data.product_value)}</p>
              )}
            </div>
          </div>
          <p className="text-[10px] text-primary">Click to view details</p>
        </CardContent>
      </Card>

      <GiftOfferModal
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

function GiftOfferModal({
  open, onClose, data, isBrand, messageId, onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  data: GiftOfferData;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: GiftOfferData) => Promise<any>;
}) {
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(data.tracking_number || "");
  const [postUrl, setPostUrl] = useState(data.creator_post_url || "");

  // Structured address fields
  const parseExistingAddress = (addr: string) => {
    const lines = addr.split("\n").map(l => l.trim());
    return {
      street: lines[0] || "",
      apartment: lines[1] || "",
      city: lines[2] || "",
      province: lines[3] || "",
      postalCode: lines[4] || "",
      country: lines[5] || "South Africa",
    };
  };
  const parsed = parseExistingAddress(data.shipping_address || "");
  const [street, setStreet] = useState(parsed.street);
  const [apartment, setApartment] = useState(parsed.apartment);
  const [city, setCity] = useState(parsed.city);
  const [province, setProvince] = useState(parsed.province);
  const [postalCode, setPostalCode] = useState(parsed.postalCode);
  const [country, setCountry] = useState(parsed.country);

  const buildAddress = () =>
    [street, apartment, city, province, postalCode, country].filter(Boolean).join("\n");
  const isAddressValid = street.trim() && city.trim() && province.trim() && postalCode.trim();
  const config = STATUS_CONFIG[data.status];

  const handleStatusChange = async (newStatus: GiftOfferStatus, extra?: Partial<GiftOfferData>) => {
    setUpdating(true);
    await onUpdate(messageId, {
      ...data,
      ...extra,
      status: newStatus,
      status_updated_at: new Date().toISOString(),
    });
    setUpdating(false);
    if (newStatus === "declined") onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift Offer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{data.campaign_title}</h3>
            <Badge className={config.color}>{config.label}</Badge>
          </div>

          <div className="flex items-center gap-4">
            {data.product_image_url && (
              <img src={data.product_image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-medium text-foreground">{data.product_name}</p>
              {data.product_value && (
                <p className="text-sm text-muted-foreground">Value: {ZAR.format(data.product_value)}</p>
              )}
            </div>
          </div>

          {data.description && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-sm text-foreground">{data.description}</p>
            </div>
          )}

          {data.tracking_number && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Tracking: {data.tracking_number}
            </p>
          )}

          {data.creator_post_url && (
            <a href={data.creator_post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> View post
            </a>
          )}

          {/* Creator actions */}
          {!isBrand && data.status === "pending" && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium">Provide your shipping address to accept:</p>
              <div className="space-y-2">
                <Input
                  placeholder="Street address *"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Apartment, suite, unit (optional)"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Province *"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Postal code *"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => handleStatusChange("accepted", { shipping_address: buildAddress() })} disabled={updating || !isAddressValid}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Accept & Share Address
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("declined")} disabled={updating}>
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )}

          {!isBrand && data.status === "delivered" && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">Share your post link:</p>
              <Input
                placeholder="Paste your post URL..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
              />
              <Button size="sm" className="w-full" onClick={() => handleStatusChange("posted", { creator_post_url: postUrl.trim() })} disabled={updating || !postUrl.trim()}>
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Submit Post
              </Button>
            </div>
          )}

          {!isBrand && data.status === "accepted" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <Package className="h-4 w-4 inline mr-1" /> Accepted! Waiting for the brand to ship your gift.
            </div>
          )}

          {!isBrand && data.status === "shipped" && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-700">
              <Truck className="h-4 w-4 inline mr-1" /> Your gift has been shipped!
              {data.tracking_number && <span> Tracking: {data.tracking_number}</span>}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("delivered")} disabled={updating}>
                  Mark as Delivered
                </Button>
              </div>
            </div>
          )}

          {/* Brand actions */}
          {isBrand && data.status === "accepted" && (
            <div className="space-y-2 border-t pt-3">
              {data.shipping_address && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Shipping Address</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{data.shipping_address}</p>
                </div>
              )}
              <Input
                placeholder="Tracking number (optional)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <Button size="sm" className="w-full" onClick={() => handleStatusChange("shipped", { tracking_number: trackingNumber.trim() || undefined })} disabled={updating}>
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Truck className="h-3.5 w-3.5 mr-1" />}
                Mark as Shipped
              </Button>
            </div>
          )}

          {isBrand && data.status === "shipped" && (
            <div className="border-t pt-3">
              <Button size="sm" className="w-full" onClick={() => handleStatusChange("delivered")} disabled={updating}>
                Mark as Delivered
              </Button>
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
