import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, MoreHorizontal, Search, Send, Pencil, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  deliverable_type: string;
  deliverable_description: string | null;
  fee_amount: number;
  content_deadline: string | null;
  revision_rounds: number;
  max_creators: number | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  brandId: string;
  brandName: string;
  onUpdated: () => void;
}

interface MentionRequest {
  id: string;
  creator_id: string;
  status: string;
  fee_amount: number;
  post_url: string | null;
  creator_note: string | null;
  brand_note: string | null;
  revision_count: number;
  created_at: string;
  creator?: { display_name: string | null; photo_url: string | null };
}

interface Creator {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  declined: "bg-red-100 text-red-700",
  content_submitted: "bg-purple-100 text-purple-700",
  revision_requested: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  paid: "bg-teal-100 text-teal-700",
  cancelled: "bg-muted text-muted-foreground",
};

const formatDeliverable = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

export function MentionCampaignDetailModal({ open, onOpenChange, campaign, brandId, brandName, onUpdated }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [creatorResults, setCreatorResults] = useState<Creator[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(campaign.title);
  const [editFee, setEditFee] = useState(String(campaign.fee_amount));
  const [editDeadline, setEditDeadline] = useState(campaign.content_deadline || "");
  const [editInstructions, setEditInstructions] = useState(campaign.deliverable_description || "");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRequests();
      setEditTitle(campaign.title);
      setEditFee(String(campaign.fee_amount));
      setEditDeadline(campaign.content_deadline || "");
      setEditInstructions(campaign.deliverable_description || "");
      setIsEditing(false);
    }
  }, [open, campaign.id]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mention_requests" as any)
      .select("*, creator:profiles(display_name, photo_url)")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data as any);
    setLoading(false);
  };

  const searchCreators = async (q: string) => {
    setCreatorSearch(q);
    if (q.length < 2) { setCreatorResults([]); return; }
    setSearching(true);
    const existingIds = requests.map((r) => r.creator_id);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, photo_url")
      .ilike("display_name", `%${q}%`)
      .limit(10);
    const filtered = (data || []).filter((c: any) => !existingIds.includes(c.id));
    setCreatorResults(filtered as Creator[]);
    setSearching(false);
  };

  const sendRequest = async (creator: Creator) => {
    setSendingTo(creator.id);
    // Insert mention request
    const { error } = await supabase.from("mention_requests" as any).insert({
      campaign_id: campaign.id,
      brand_id: brandId,
      creator_id: creator.id,
      fee_amount: campaign.fee_amount,
      status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSendingTo(null);
      return;
    }
    // Send notification message via conversations
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("brand_id", brandId)
      .eq("creator_id", creator.id)
      .maybeSingle();
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ brand_id: brandId, creator_id: creator.id })
        .select("id")
        .single();
      if (newConv) convId = newConv.id;
    }
    if (convId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: authData.user.id,
          message_type: "mention_request",
          content: `You've received a paid mention request from ${brandName}: ${campaign.title}. Fee: ${formatZAR(campaign.fee_amount)}. Check your Mentions tab to respond.`,
        });
      }
    }
    toast({ title: `Request sent to ${creator.display_name || "creator"}.` });
    setSendingTo(null);
    setCreatorSearch("");
    setCreatorResults([]);
    fetchRequests();
    onUpdated();
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, extraFields: Record<string, any> = {}) => {
    const { error } = await supabase
      .from("mention_requests" as any)
      .update({ status: newStatus, ...extraFields })
      .eq("id", requestId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${newStatus.replace(/_/g, " ")}` });
      fetchRequests();
      onUpdated();
    }
  };

  const updateCampaignStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("mention_campaigns" as any)
      .update({ status: newStatus })
      .eq("id", campaign.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Campaign ${newStatus}` });
      onUpdated();
    }
  };

  const saveEdits = async () => {
    setSavingEdit(true);
    const { error } = await supabase
      .from("mention_campaigns" as any)
      .update({
        title: editTitle.trim(),
        fee_amount: parseFloat(editFee),
        content_deadline: editDeadline || null,
        deliverable_description: editInstructions.trim(),
      })
      .eq("id", campaign.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign updated." });
      setIsEditing(false);
      onUpdated();
    }
  };

  const campaignStatusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-3">
            {campaign.title}
            <Badge className={campaignStatusColors[campaign.status] || ""}>{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</Badge>
            <Badge variant="outline">{formatDeliverable(campaign.deliverable_type)}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Campaign Info */}
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Fee (ZAR)</label>
                <Input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Deadline</label>
                <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Content Instructions</label>
                <Textarea value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} className="min-h-[80px]" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdits} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm"><span className="font-medium">Fee:</span> {formatZAR(campaign.fee_amount)} per post</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  {campaign.status === "draft" || campaign.status === "paused" ? (
                    <Button size="sm" onClick={() => updateCampaignStatus("active")}>Activate</Button>
                  ) : campaign.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => updateCampaignStatus("paused")}>Pause</Button>
                  ) : null}
                  {campaign.status !== "closed" && (
                    <Button size="sm" variant="destructive" onClick={() => updateCampaignStatus("closed")}>Close</Button>
                  )}
                </div>
              </div>
              {campaign.content_deadline && <p className="text-sm"><span className="font-medium">Deadline:</span> {format(new Date(campaign.content_deadline), "dd MMM yyyy")}</p>}
              <p className="text-sm"><span className="font-medium">Revisions:</span> {campaign.revision_rounds}</p>
              {campaign.deliverable_description && <p className="text-sm text-muted-foreground">{campaign.deliverable_description}</p>}
            </div>
          )}

          {/* Send to Creators */}
          {campaign.status === "active" && (
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-sm">Send to Creators</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search creators by name..."
                  value={creatorSearch}
                  onChange={(e) => searchCreators(e.target.value)}
                />
              </div>
              {creatorResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {creatorResults.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={c.photo_url || undefined} />
                          <AvatarFallback className="text-xs">{(c.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{c.display_name || "Unknown"}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => sendRequest(c)} disabled={sendingTo === c.id}>
                        {sendingTo === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span className="ml-1">Send</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Table */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">Requests</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={req.creator?.photo_url || undefined} />
                            <AvatarFallback className="text-xs">{(req.creator?.display_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{req.creator?.display_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatZAR(req.fee_amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[req.status] || ""}>{req.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
                      </TableCell>
                      <TableCell>
                        {req.post_url ? (
                          <a href={req.post_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-primary" /></a>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {req.status === "content_submitted" && (
                              <>
                                <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "approved", { approved_at: new Date().toISOString() })}>Approve Post</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "revision_requested", { revision_count: req.revision_count + 1, brand_note: "Please revise your post." })}>Request Revision</DropdownMenuItem>
                              </>
                            )}
                            {req.status === "approved" && (
                              <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "paid")}>Mark as Paid</DropdownMenuItem>
                            )}
                            {(req.status === "pending" || req.status === "accepted") && (
                              <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "cancelled")}>Cancel Request</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={async () => {
                              let convId: string | null = null;
                              const { data: existingConv } = await supabase
                                .from("conversations").select("id")
                                .eq("brand_id", brandId).eq("creator_id", req.creator_id).maybeSingle();
                              if (existingConv) { convId = existingConv.id; }
                              else {
                                const { data: newConv } = await supabase
                                  .from("conversations").insert({ brand_id: brandId, creator_id: req.creator_id })
                                  .select("id").single();
                                if (newConv) convId = newConv.id;
                              }
                              onOpenChange(false);
                              navigate("/brand/messages", { state: { conversationId: convId } });
                            }}>
                              <MessageSquare className="h-4 w-4 mr-2" />Message Creator
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
