import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Megaphone, Loader2, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface MentionRequest {
  id: string;
  campaign_id: string;
  brand_id: string;
  creator_id: string;
  status: string;
  fee_amount: number;
  creator_note: string | null;
  brand_note: string | null;
  post_url: string | null;
  post_submitted_at: string | null;
  approved_at: string | null;
  revision_count: number;
  created_at: string;
  campaign?: {
    title: string;
    deliverable_type: string;
    deliverable_description: string | null;
    content_deadline: string | null;
    revision_rounds: number;
  };
  brand?: { name: string; logo_url: string | null; logo_upload_url: string | null };
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

export default function Mentions() {
  const { profile, loading: profileLoading } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});
  const [postUrlInputs, setPostUrlInputs] = useState<Record<string, string>>({});
  const [acceptNotes, setAcceptNotes] = useState<Record<string, string>>({});
  const [showAcceptNote, setShowAcceptNote] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const tier = profile?.tier || "enthusiast";
  const displayName = profile?.display_name;

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("mention_requests" as any)
      .select(
        "*, campaign:mention_campaigns(title, deliverable_type, deliverable_description, content_deadline, revision_rounds), brand:brand_accounts(name, logo_url, logo_upload_url)",
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setRequests(data as any);
      const urlMap: Record<string, string> = {};
      (data as any[]).forEach((r) => {
        if (r.post_url) urlMap[r.id] = r.post_url;
      });
      setPostUrlInputs((prev) => ({ ...prev, ...urlMap }));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id: string, newStatus: string, extra: Record<string, any> = {}) => {
    const prev = [...requests];
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: newStatus, ...extra } : r)));
    setUpdatingId(id);
    const { error } = await supabase
      .from("mention_requests" as any)
      .update({ status: newStatus, ...extra })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setRequests(prev);
    } else {
      toast({ title: `Status updated.` });
    }
    setUpdatingId(null);
  };

  const handleAccept = (id: string) => {
    updateStatus(id, "accepted", { creator_note: acceptNotes[id] || null });
  };

  const handleDecline = (id: string) => {
    updateStatus(id, "declined");
  };

  const handleSubmitPost = (id: string) => {
    const url = postUrlInputs[id];
    if (!url?.trim()) {
      toast({ title: "Please enter a post URL", variant: "destructive" });
      return;
    }
    updateStatus(id, "content_submitted", { post_url: url.trim(), post_submitted_at: new Date().toISOString() });
  };

  const handleResubmitPost = (req: MentionRequest) => {
    const url = postUrlInputs[req.id];
    if (!url?.trim()) {
      toast({ title: "Please enter a post URL", variant: "destructive" });
      return;
    }
    updateStatus(req.id, "content_submitted", {
      post_url: url.trim(),
      post_submitted_at: new Date().toISOString(),
      revision_count: req.revision_count + 1,
    });
  };

  const actionRequired = requests.filter((r) => ["pending", "accepted", "revision_requested"].includes(r.status));
  const history = requests.filter((r) =>
    ["content_submitted", "approved", "paid", "declined", "cancelled"].includes(r.status),
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const activeCount = requests.filter((r) =>
    ["accepted", "content_submitted", "revision_requested"].includes(r.status),
  ).length;
  const totalEarned = requests
    .filter((r) => r.status === "approved" || r.status === "paid")
    .reduce((s, r) => s + Number(r.fee_amount), 0);

  if (profileLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderCard = (req: MentionRequest) => {
    const deadline = req.campaign?.content_deadline;
    const daysLeft = deadline ? differenceInDays(new Date(deadline), new Date()) : null;
    const instructions = req.campaign?.deliverable_description || "";
    const isExpanded = expandedInstructions[req.id];

    return (
      <Card key={req.id} className="overflow-hidden">
        <CardContent className="p-5 space-y-3">
          {/* Brand + Campaign */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={req.brand?.logo_upload_url || req.brand?.logo_url || undefined} />
                <AvatarFallback>{(req.brand?.name || "?")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{req.brand?.name || "Brand"}</p>
                <p className="text-sm text-muted-foreground">{req.campaign?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {req.campaign?.deliverable_type && (
                <Badge variant="outline">{formatDeliverable(req.campaign.deliverable_type)}</Badge>
              )}
              <Badge className={statusColors[req.status] || ""}>
                {req.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>
          </div>

          {/* Fee */}
          <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
            {formatZAR(Number(req.fee_amount))}
          </p>

          {/* Deadline */}
          {deadline && (
            <p
              className={`text-sm ${daysLeft !== null && daysLeft < 0 ? "text-red-600 font-medium" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
            >
              Due {format(new Date(deadline), "dd MMM yyyy")}
            </p>
          )}

          {/* Instructions */}
          {instructions && (
            <div>
              <p className="text-sm text-muted-foreground">
                {isExpanded ? instructions : instructions.slice(0, 100)}
                {instructions.length > 100 && !isExpanded && "..."}
              </p>
              {instructions.length > 100 && (
                <button
                  className="text-xs text-primary flex items-center gap-1 mt-1"
                  onClick={() => setExpandedInstructions((p) => ({ ...p, [req.id]: !p[req.id] }))}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Read more
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Revision info */}
          {req.revision_count > 0 && req.status === "revision_requested" && (
            <p className="text-sm text-orange-600 font-medium">Revision {req.revision_count} requested</p>
          )}
          {req.status === "revision_requested" && req.brand_note && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-sm text-amber-800">{req.brand_note}</AlertDescription>
            </Alert>
          )}

          {/* Message Brand */}
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={async () => {
              if (!user) return;
              let convId: string | null = null;
              const { data: existingConv } = await supabase
                .from("conversations")
                .select("id")
                .eq("brand_id", req.brand_id)
                .eq("creator_id", user.id)
                .maybeSingle();
              if (existingConv) {
                convId = existingConv.id;
              } else {
                // Creator can't insert conversations per RLS, so just navigate
                convId = null;
              }
              navigate("/messages", { state: { conversationId: convId, brandId: req.brand_id } });
            }}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Message {req.brand?.name || "Brand"}
          </Button>

          {/* Actions */}
          {req.status === "pending" && (
            <div className="space-y-2 pt-2">
              {showAcceptNote[req.id] ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Optional note to the brand..."
                    value={acceptNotes[req.id] || ""}
                    onChange={(e) => setAcceptNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(req.id)} disabled={updatingId === req.id}>
                      {updatingId === req.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Confirm Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAcceptNote((p) => ({ ...p, [req.id]: false }))}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowAcceptNote((p) => ({ ...p, [req.id]: true }))}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(req.id)}
                    disabled={updatingId === req.id}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          )}

          {req.status === "accepted" && (
            <div className="space-y-2 pt-2 border-t">
              <Input
                placeholder="Paste your live post link here"
                value={postUrlInputs[req.id] || ""}
                onChange={(e) => setPostUrlInputs((p) => ({ ...p, [req.id]: e.target.value }))}
              />
              <Button size="sm" onClick={() => handleSubmitPost(req.id)} disabled={updatingId === req.id}>
                {updatingId === req.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Submit Post for Approval
              </Button>
            </div>
          )}

          {req.status === "revision_requested" && (
            <div className="space-y-2 pt-2 border-t">
              <Input
                placeholder="Paste your live post link here"
                value={postUrlInputs[req.id] || ""}
                onChange={(e) => setPostUrlInputs((p) => ({ ...p, [req.id]: e.target.value }))}
              />
              <Button size="sm" onClick={() => handleResubmitPost(req)} disabled={updatingId === req.id}>
                {updatingId === req.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Resubmit Post
              </Button>
            </div>
          )}

          {req.status === "content_submitted" && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Submitted {req.post_submitted_at ? format(new Date(req.post_submitted_at), "dd MMM yyyy") : ""}. Awaiting
              brand approval.
            </div>
          )}

          {req.status === "approved" && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              Approved! Payment of {formatZAR(Number(req.fee_amount))} will be processed shortly.
            </div>
          )}

          {req.status === "paid" && (
            <div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-700">
              Paid {formatZAR(Number(req.fee_amount))}
              {req.approved_at ? ` on ${format(new Date(req.approved_at), "dd MMM yyyy")}` : ""}.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar
        tier={tier}
        displayName={displayName}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-10 sm:space-y-12"
        >
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Mentions</h1>
            </div>
            <p className="text-muted-foreground">Brands pay you a fixed fee to post about their products.</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Pending Requests", value: pendingCount },
              { label: "Active Posts", value: activeCount },
              { label: "Total Earned", value: formatZAR(totalEarned) },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">
                    {m.label}
                  </p>
                  <p className="text-lg sm:text-2xl font-display font-bold text-foreground mt-1 truncate">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No mention requests yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                When brands send you paid post requests, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {actionRequired.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-semibold text-foreground">Action Required</h2>
                  <div className="space-y-4">{actionRequired.map(renderCard)}</div>
                </div>
              )}
              {history.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-semibold text-foreground">History</h2>
                  <div className="space-y-4">{history.map(renderCard)}</div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
