import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { AppFooter } from "@/components/layout/AppFooter";
import { supabase } from "@/integrations/supabase/client";

interface GiftRequestRow {
  id: string;
  status: string;
  creator_post_url: string | null;
  created_at: string;
  campaign?: { title: string } | null;
  brand?: { name: string } | null;
  creator?: { display_name: string | null } | null;
}

interface MentionRequestRow {
  id: string;
  status: string;
  fee_amount: number;
  post_url: string | null;
  post_submitted_at: string | null;
  created_at: string;
  campaign?: { title: string; deliverable_type: string } | null;
  brand?: { name: string } | null;
  creator?: { display_name: string | null } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  declined: "bg-red-100 text-red-700",
  shipped: "bg-teal-100 text-teal-700",
  delivered: "bg-purple-100 text-purple-700",
  posted: "bg-emerald-100 text-emerald-700",
  content_submitted: "bg-purple-100 text-purple-700",
  revision_requested: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  paid: "bg-teal-100 text-teal-700",
  cancelled: "bg-muted text-muted-foreground",
};

const formatDeliverable = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

export default function AdminModeration() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [giftRequests, setGiftRequests] = useState<GiftRequestRow[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [mentionRequests, setMentionRequests] = useState<MentionRequestRow[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    const fetchGiftRequests = async () => {
      setLoadingGifts(true);
      const { data } = await supabase
        .from("gift_requests")
        .select("*, campaign:gift_campaigns(title), brand:brand_accounts(name), creator:profiles(display_name)")
        .order("created_at", { ascending: false });
      if (data) setGiftRequests(data as any);
      setLoadingGifts(false);
    };
    const fetchMentionRequests = async () => {
      setLoadingMentions(true);
      const { data } = await supabase
        .from("mention_requests" as any)
        .select("*, campaign:mention_campaigns(title, deliverable_type), brand:brand_accounts(name), creator:profiles(display_name)")
        .order("created_at", { ascending: false });
      if (data) setMentionRequests(data as any);
      setLoadingMentions(false);
    };
    if (role === "admin") {
      fetchGiftRequests();
      fetchMentionRequests();
    }
  }, [role]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Moderation</h1>
          <p className="text-muted-foreground">Review flagged content and user reports.</p>
        </div>

        <Tabs defaultValue="flagged">
          <TabsList>
            <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
            <TabsTrigger value="gift-requests">Gift Requests</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>

          <TabsContent value="flagged" className="mt-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No items to review</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Flagged content, reported users, and items requiring review will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gift-requests" className="mt-6">
            {loadingGifts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : giftRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No gift requests</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    All gift requests across brands will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Post</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {giftRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm font-medium">{req.brand?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{req.creator?.display_name || "—"}</TableCell>
                        <TableCell className="text-sm">{req.campaign?.title || "—"}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="mentions" className="mt-6">
            {loadingMentions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mentionRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No mention requests</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    All mention requests across brands will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Deliverable</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentionRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm font-medium">{req.brand?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{req.creator?.display_name || "—"}</TableCell>
                        <TableCell className="text-sm">{req.campaign?.title || "—"}</TableCell>
                        <TableCell className="text-sm">{req.campaign?.deliverable_type ? formatDeliverable(req.campaign.deliverable_type) : "—"}</TableCell>
                        <TableCell className="text-sm">{formatZAR(req.fee_amount)}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
                            {req.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </TableCell>
                        <TableCell>
                          {req.post_url ? (
                            <a href={req.post_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 text-primary" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.post_submitted_at ? new Date(req.post_submitted_at).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <AppFooter />
      </div>
    </AdminLayout>
  );
}
