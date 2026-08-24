import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift, ExternalLink, MoreHorizontal, Search, Send, Pencil, Trash2 } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  product_name: string;
  product_image_url: string | null;
  product_images?: string[] | null;
  product_value: number | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  brandId: string;
  onUpdated: () => void;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaignId: string) => void;
}

interface Creator {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  niche_tags: string[] | null;
}

interface GiftRequest {
  id: string;
  creator_id: string;
  status: string;
  shipping_address: string | null;
  tracking_number: string | null;
  creator_post_url: string | null;
  creator?: { display_name: string | null; photo_url: string | null };
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  declined: "bg-red-100 text-red-700",
  shipped: "bg-teal-100 text-teal-700",
  delivered: "bg-purple-100 text-purple-700",
  posted: "bg-emerald-100 text-emerald-700",
};

export function GiftCampaignDetailModal({ open, onOpenChange, campaign, brandId, onUpdated, onEdit, onDelete }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<GiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [creatorResults, setCreatorResults] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingValue, setTrackingValue] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gift_requests")
      .select("*, creator:profiles(display_name, photo_url)")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchRequests();
  }, [open, campaign.id]);

  useEffect(() => {
    if (creatorSearch.length < 2) {
      setCreatorResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, niche_tags")
        .or(`display_name.ilike.%${creatorSearch}%,username.ilike.%${creatorSearch}%`)
        .limit(5);
      if (data) setCreatorResults(data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [creatorSearch]);

  const updateCampaignStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from("gift_campaigns").update({ status: newStatus }).eq("id", campaign.id);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Campaign ${newStatus}` });
      onUpdated();
      if (newStatus === "closed") onOpenChange(false);
    }
  };

  const sendGiftRequest = async () => {
    if (!selectedCreator) return;
    setSending(true);

    // Insert gift request
    const { error } = await supabase.from("gift_requests").insert({
      campaign_id: campaign.id,
      brand_id: brandId,
      creator_id: selectedCreator.id,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // Get brand name
    const { data: brand } = await supabase.from("brand_accounts").select("name").eq("id", brandId).maybeSingle();

    // Find or create conversation to send message
    let conversationId: string | null = null;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("brand_id", brandId)
      .eq("creator_id", selectedCreator.id)
      .maybeSingle();

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({ brand_id: brandId, creator_id: selectedCreator.id })
        .select("id")
        .single();
      if (newConvo) conversationId = newConvo.id;
    }

    if (conversationId) {
      const { data: session } = await supabase.auth.getSession();
      const senderId = session?.session?.user?.id;
      if (senderId) {
        const images = campaign.product_images || (campaign.product_image_url ? [campaign.product_image_url] : []);
        const collabData = {
          collab_id: campaign.id,
          title: campaign.title,
          compensation_type: "Gifting",
          description: campaign.description || undefined,
          product_name: campaign.product_name,
          product_value: campaign.product_value || undefined,
          product_image_url: images[0] || campaign.product_image_url || undefined,
          product_images: images.length > 0 ? images : undefined,
          status: "pending",
        };
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: `🎁 ${campaign.title}`,
          message_type: "paid_collab",
          brief_data: collabData as any,
        });
      }
    }

    // Send email notification to creator
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "gift-request-creator",
        recipientUserId: selectedCreator.id,
        idempotencyKey: `gift-req-${campaign.id}-${selectedCreator.id}`,
        templateData: {
          brandName: brand?.name || "A brand",
          campaignTitle: campaign.title,
          productName: campaign.product_name,
          productValue: campaign.product_value?.toFixed(2),
          productImageUrl: campaign.product_image_url || undefined,
        },
      },
    });

    setSending(false);
    toast({ title: "Gift request sent!" });
    setSelectedCreator(null);
    setCreatorSearch("");
    fetchRequests();
    onUpdated();
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    const req = requests.find((r) => r.id === requestId);
    const { error } = await supabase.from("gift_requests").update({ status: newStatus }).eq("id", requestId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${newStatus}` });
      // Email creator on shipped/delivered
      if (req && (newStatus === "shipped" || newStatus === "delivered")) {
        const { data: brand } = await supabase.from("brand_accounts").select("name").eq("id", brandId).maybeSingle();
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "gift-status-creator",
            recipientUserId: req.creator_id,
            idempotencyKey: `gift-status-${requestId}-${newStatus}`,
            templateData: {
              brandName: brand?.name || "A brand",
              productName: campaign.product_name,
              status: newStatus,
              trackingNumber: req.tracking_number,
            },
          },
        });
      }
      fetchRequests();
      onUpdated();
    }
  };

  const saveTrackingNumber = async (requestId: string) => {
    const { error } = await supabase
      .from("gift_requests")
      .update({ tracking_number: trackingValue })
      .eq("id", requestId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tracking number saved" });
      setEditingTracking(null);
      fetchRequests();
    }
  };

  const getNextStatuses = (current: string) => {
    const map: Record<string, string[]> = {
      pending: ["accepted", "declined"],
      accepted: ["shipped"],
      shipped: ["delivered"],
      delivered: ["posted"],
    };
    return map[current] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{campaign.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {campaign.product_image_url ? (
                <img
                  src={campaign.product_image_url}
                  alt={campaign.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gift className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || "bg-muted text-muted-foreground"}`}
                >
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
              <p className="font-medium text-foreground">{campaign.product_name}</p>
              {campaign.product_value && (
                <p className="text-sm text-muted-foreground">R{campaign.product_value.toFixed(2)} value</p>
              )}
              {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
              {campaign.status !== "closed" && (
                <div className="flex gap-2 pt-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEdit(campaign);
                        onOpenChange(false);
                      }}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCampaignStatus("closed")}
                    disabled={updatingStatus}
                  >
                    Close Campaign
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => {
                        onDelete(campaign.id);
                        onOpenChange(false);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Creator Selection (only when active) */}
          {campaign.status !== "closed" && (
            <div className="space-y-3 border rounded-xl p-4">
              <h4 className="font-display font-semibold text-sm">Send Gift Request</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={creatorSearch}
                  onChange={(e) => {
                    setCreatorSearch(e.target.value);
                    setSelectedCreator(null);
                  }}
                  placeholder="Search creators by name..."
                  className="pl-9"
                />
              </div>
              {creatorResults.length > 0 && !selectedCreator && (
                <div className="border rounded-xl overflow-hidden">
                  {creatorResults.map((c) => (
                    <button
                      key={c.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      onClick={() => {
                        setSelectedCreator(c);
                        setCreatorResults([]);
                        setCreatorSearch(c.display_name || "");
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.photo_url || ""} />
                        <AvatarFallback>{c.display_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{c.display_name}</p>
                        {c.niche_tags && c.niche_tags.length > 0 && (
                          <p className="text-xs text-muted-foreground">{c.niche_tags.slice(0, 3).join(", ")}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedCreator && (
                <div className="flex items-center justify-between bg-muted rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedCreator.photo_url || ""} />
                      <AvatarFallback>{selectedCreator.display_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedCreator.display_name}</p>
                      {selectedCreator.niche_tags && selectedCreator.niche_tags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedCreator.niche_tags.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={sendGiftRequest} disabled={sending} className="gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Gift Request
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Requests Table */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm">Gift Requests ({requests.length})</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={req.creator?.photo_url || ""} />
                            <AvatarFallback>{req.creator?.display_name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{req.creator?.display_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {req.shipping_address ? (
                          <span className="text-xs text-foreground">{req.shipping_address}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTracking === req.id ? (
                          <div className="flex gap-1">
                            <Input
                              value={trackingValue}
                              onChange={(e) => setTrackingValue(e.target.value)}
                              className="h-7 text-xs w-28"
                              placeholder="Tracking #"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => saveTrackingNumber(req.id)}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                              setEditingTracking(req.id);
                              setTrackingValue(req.tracking_number || "");
                            }}
                          >
                            {req.tracking_number || "Add tracking"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.creator_post_url ? (
                          <a href={req.creator_post_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 text-primary" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getNextStatuses(req.status).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {getNextStatuses(req.status).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => updateRequestStatus(req.id, s)}>
                                  Mark as {s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
