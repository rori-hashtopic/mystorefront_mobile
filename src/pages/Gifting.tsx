import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Gift, Check, X, Truck, Link as LinkIcon, ExternalLink, Package, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppFooter } from "@/components/layout/AppFooter";

interface GiftRequest {
  id: string;
  campaign_id: string;
  brand_id: string;
  creator_id: string;
  status: string;
  shipping_address: string | null;
  tracking_number: string | null;
  creator_post_url: string | null;
  created_at: string;
  campaign?: {
    title: string;
    product_name: string;
    product_value: number | null;
    product_image_url: string | null;
    description: string | null;
  };
  brand?: { name: string; logo_url: string | null };
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700 bg-amber-100", label: "Pending" },
  accepted: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700 bg-blue-100", label: "Accepted" },
  declined: { bg: "bg-red-50 border-red-200", text: "text-red-700 bg-red-100", label: "Declined" },
  shipped: { bg: "bg-teal-50 border-teal-200", text: "text-teal-700 bg-teal-100", label: "Shipped" },
  delivered: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700 bg-purple-100", label: "Delivered" },
  posted: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700 bg-emerald-100", label: "Posted" },
};

function ProductPreviewModal({
  request,
  open,
  onClose,
  saving,
  onUpdateStatus,
}: {
  request: GiftRequest;
  open: boolean;
  onClose: () => void;
  saving: string | null;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto p-0 sm:p-6 rounded-t-2xl sm:rounded-xl fixed bottom-0 sm:relative sm:bottom-auto">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="px-5 pb-6 sm:px-0 sm:pb-0">
          <DialogHeader>
            <DialogTitle className="font-display">Product Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {request.campaign?.product_image_url && (
              <div className="rounded-xl overflow-hidden bg-muted aspect-square max-h-72 flex items-center justify-center">
                <img
                  src={request.campaign.product_image_url}
                  alt={request.campaign?.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-lg text-foreground">{request.campaign?.product_name}</h3>
              <p className="text-sm text-muted-foreground">{request.campaign?.title}</p>
              {request.campaign?.product_value && (
                <p className="text-base font-semibold text-foreground">
                  R{request.campaign.product_value.toFixed(2)} value
                </p>
              )}
              {request.campaign?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border">
                  {request.campaign.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Avatar className="h-8 w-8">
                <AvatarImage src={request.brand?.logo_url || ""} />
                <AvatarFallback className="text-xs">{request.brand?.name?.charAt(0) || "B"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{request.brand?.name}</span>
            </div>
            {request.status === "pending" && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    onUpdateStatus(request.id, "accepted");
                    onClose();
                  }}
                  disabled={saving === request.id}
                >
                  <Check className="h-4 w-4" /> Accept Gift
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    onUpdateStatus(request.id, "declined");
                    onClose();
                  }}
                  disabled={saving === request.id}
                >
                  <X className="h-4 w-4" /> Decline
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* end px-5 wrapper */}
      </DialogContent>
    </Dialog>
  );
}

interface AddressForm {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

const emptyAddress: AddressForm = { street: "", city: "", province: "", postalCode: "" };

function GiftRequestCard({
  req,
  saving,
  addressForms,
  postUrlInputs,
  onAddressFieldChange,
  onPostUrlChange,
  onUpdateStatus,
  onPreview,
}: {
  req: GiftRequest;
  saving: string | null;
  addressForms: Record<string, AddressForm>;
  postUrlInputs: Record<string, string>;
  onAddressFieldChange: (id: string, field: keyof AddressForm, val: string) => void;
  onPostUrlChange: (id: string, val: string) => void;
  onUpdateStatus: (id: string, status: string, extra?: Record<string, any>) => void;
  onPreview: (req: GiftRequest) => void;
}) {
  const status = statusConfig[req.status] || statusConfig.pending;
  const hasImage = !!req.campaign?.product_image_url;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Product image / thumbnail */}
          <div
            className="relative sm:w-40 h-40 sm:h-auto flex-shrink-0 bg-muted cursor-pointer group"
            onClick={() => onPreview(req)}
          >
            {hasImage ? (
              <img
                src={req.campaign!.product_image_url!}
                alt={req.campaign?.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={req.brand?.logo_url || ""} />
                  <AvatarFallback className="text-xs font-medium">{req.brand?.name?.charAt(0) || "B"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm">{req.brand?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{req.campaign?.title}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${status.text}`}>
                {status.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="font-medium text-foreground text-sm">{req.campaign?.product_name}</p>
              {req.campaign?.product_value && (
                <span className="text-xs text-muted-foreground">· R{req.campaign.product_value.toFixed(2)}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs px-0 h-auto text-muted-foreground hover:text-foreground w-fit"
                onClick={() => onPreview(req)}
              >
                <Eye className="h-3.5 w-3.5" /> View product details
              </Button>
              {req.status === "posted" && req.creator_post_url && (
                <a
                  href={req.creator_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1.5 w-fit"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View your post
                </a>
              )}
            </div>

            {/* Status-specific actions */}
            {req.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onUpdateStatus(req.id, "accepted")}
                  disabled={saving === req.id}
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onUpdateStatus(req.id, "declined")}
                  disabled={saving === req.id}
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </Button>
              </div>
            )}

            {req.status === "accepted" && !req.shipping_address && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground">Enter your shipping address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Street address"
                    value={(addressForms[req.id] || emptyAddress).street}
                    onChange={(e) => onAddressFieldChange(req.id, "street", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="City"
                    value={(addressForms[req.id] || emptyAddress).city}
                    onChange={(e) => onAddressFieldChange(req.id, "city", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Province / State"
                    value={(addressForms[req.id] || emptyAddress).province}
                    onChange={(e) => onAddressFieldChange(req.id, "province", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Postal code"
                    value={(addressForms[req.id] || emptyAddress).postalCode}
                    onChange={(e) => onAddressFieldChange(req.id, "postalCode", e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const a = addressForms[req.id] || emptyAddress;
                    const formatted = `${a.street}, ${a.city}, ${a.province}, ${a.postalCode}`;
                    onUpdateStatus(req.id, "accepted", { shipping_address: formatted });
                  }}
                  disabled={
                    saving === req.id || !(addressForms[req.id]?.street?.trim() && addressForms[req.id]?.city?.trim())
                  }
                >
                  Submit Address
                </Button>
              </div>
            )}

            {req.status === "accepted" && req.shipping_address && (
              <p className="text-xs text-muted-foreground pt-1">📍 {req.shipping_address}</p>
            )}

            {req.status === "shipped" && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs">Tracking: {req.tracking_number || "Not provided"}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus(req.id, "delivered")}
                  disabled={saving === req.id}
                >
                  Mark Delivered
                </Button>
              </div>
            )}

            {req.status === "delivered" && (
              <div className="flex gap-2 items-end pt-1">
                <div className="flex-1">
                  <Input
                    placeholder="Paste your post URL"
                    value={postUrlInputs[req.id] || ""}
                    onChange={(e) => onPostUrlChange(req.id, e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onUpdateStatus(req.id, "posted", { creator_post_url: postUrlInputs[req.id] })}
                  disabled={saving === req.id || !postUrlInputs[req.id]?.trim()}
                >
                  <LinkIcon className="h-3.5 w-3.5" /> I've Posted
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Gifting() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [requests, setRequests] = useState<GiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressForms, setAddressForms] = useState<
    Record<string, { street: string; city: string; province: string; postalCode: string }>
  >({});
  const [postUrlInputs, setPostUrlInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [previewReq, setPreviewReq] = useState<GiftRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "creator") navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("gift_requests")
      .select(
        "*, campaign:gift_campaigns(title, product_name, product_value, product_image_url, description), brand:brand_accounts(name, logo_url)",
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  // Realtime: re-fetch when gift_requests or gift_campaigns change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("creator-gifting-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gift_requests", filter: `creator_id=eq.${user.id}` },
        () => fetchRequests(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "gift_campaigns" }, () => fetchRequests())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, any>) => {
    setSaving(id);
    const req = requests.find((r) => r.id === id);
    const { error } = await supabase
      .from("gift_requests")
      .update({ status, ...extra })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Updated to ${status}` });

      // Email brand on accept/decline
      if (req && (status === "accepted" || status === "declined")) {
        const { data: brandAccount } = await supabase
          .from("brand_accounts")
          .select("owner_user_id")
          .eq("id", req.brand_id)
          .maybeSingle();
        if (brandAccount) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "gift-response-brand",
              recipientUserId: brandAccount.owner_user_id,
              idempotencyKey: `gift-response-${id}-${status}`,
              templateData: {
                creatorName: user?.user_metadata?.display_name || "A creator",
                campaignTitle: req.campaign?.title,
                response: status,
              },
            },
          });
        }
      }

      // Email brand when creator posts
      if (req && status === "posted" && extra?.creator_post_url) {
        const { data: brandAccount } = await supabase
          .from("brand_accounts")
          .select("owner_user_id")
          .eq("id", req.brand_id)
          .maybeSingle();
        if (brandAccount) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "gift-posted-brand",
              recipientUserId: brandAccount.owner_user_id,
              idempotencyKey: `gift-posted-${id}`,
              templateData: {
                creatorName: user?.user_metadata?.display_name || "A creator",
                campaignTitle: req.campaign?.title,
                productName: req.campaign?.product_name,
                postUrl: extra.creator_post_url,
              },
            },
          });
        }
      }

      fetchRequests();
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pt-4 sm:pt-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">Gifting</h1>
          <p className="text-muted-foreground text-sm">Manage product gifts from brands.</p>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">No gift requests yet</h3>
              <p className="text-muted-foreground text-center text-sm max-w-md">
                When brands send you product gifts, they'll appear here for you to manage.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <GiftRequestCard
                key={req.id}
                req={req}
                saving={saving}
                addressForms={addressForms}
                postUrlInputs={postUrlInputs}
                onAddressFieldChange={(id, field, val) =>
                  setAddressForms((prev) => ({ ...prev, [id]: { ...(prev[id] || emptyAddress), [field]: val } }))
                }
                onPostUrlChange={(id, val) => setPostUrlInputs((prev) => ({ ...prev, [id]: val }))}
                onUpdateStatus={updateStatus}
                onPreview={setPreviewReq}
              />
            ))}
          </div>
        )}

        {previewReq && (
          <ProductPreviewModal
            request={previewReq}
            open={!!previewReq}
            onClose={() => setPreviewReq(null)}
            saving={saving}
            onUpdateStatus={updateStatus}
          />
        )}

        <AppFooter />
      </div>
    </DashboardLayout>
  );
}
