import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { TierBanner } from "@/components/brand/TierBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Plus, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreateGiftCampaignModal } from "@/components/brand/CreateGiftCampaignModal";
import { GiftCampaignDetailModal } from "@/components/brand/GiftCampaignDetailModal";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  product_name: string;
  product_image_url: string | null;
  product_value: number | null;
  status: string;
}

interface GiftRequest {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  tracking_number: string | null;
  creator_post_url: string | null;
  creator?: { display_name: string | null; photo_url: string | null };
}

const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  shipped: "bg-violet-100 text-violet-700",
  delivered: "bg-purple-100 text-purple-700",
  posted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

export default function BrandGifting() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand } = useBrandAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<GiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    const [campaignsRes, requestsRes] = await Promise.all([
      supabase.from("gift_campaigns").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
      supabase
        .from("gift_requests")
        .select("*, creator:profiles(display_name, photo_url)")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false }),
    ]);
    setCampaigns((campaignsRes.data as any[]) || []);
    setRequests((requestsRes.data as any[]) || []);
    setLoading(false);
  }, [brand]);

  useEffect(() => {
    if (brand) fetchData();
  }, [brand, fetchData]);

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-6">
        <TierBanner tier="premium" />
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Gifting</h1>
            <p className="text-muted-foreground">Manage PR sends and product seeding to creators.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New campaign
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Gift className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No gifting campaigns yet</p>
              <p className="text-sm text-muted-foreground mt-1">Send products to creators and track when they post.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {campaigns.map((campaign) => {
              const campaignReqs = requests.filter((r) => r.campaign_id === campaign.id);
              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Gift className="h-5 w-5" /> {campaign.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.product_name}
                          {campaign.product_value != null && <> · {formatZAR(campaign.product_value)} value</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="default">{campaign.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => setSelected(campaign)}>
                          Manage
                        </Button>
                      </div>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-2">{campaign.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Requests ({campaignReqs.length})
                    </p>
                    {campaignReqs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3">
                        No requests yet. Invite creators from the manage modal.
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {campaignReqs.map((req) => (
                          <div key={req.id} className="flex items-center gap-3 py-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={req.creator?.photo_url || undefined} />
                              <AvatarFallback>{(req.creator?.display_name || "?")[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">
                                {req.creator?.display_name || "Creator"}
                              </p>
                              {req.tracking_number && (
                                <p className="text-xs text-muted-foreground">
                                  Tracking <span className="font-mono">{req.tracking_number}</span>
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                statusColor[req.status] || "bg-muted text-muted-foreground"
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.creator_post_url && (
                              <a
                                href={req.creator_post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-foreground inline-flex items-center gap-1 hover:underline"
                              >
                                View post <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {brand && (
        <>
          <CreateGiftCampaignModal
            open={showCreate}
            onOpenChange={setShowCreate}
            brandId={brand.id}
            onCreated={() => {
              setShowCreate(false);
              fetchData();
            }}
          />
          {selected && (
            <GiftCampaignDetailModal
              open={!!selected}
              onOpenChange={(o) => !o && setSelected(null)}
              campaign={selected as any}
              brandId={brand.id}
              onUpdated={fetchData}
              onEdit={() => {
                /* no-op: edit flow goes through detail modal */
              }}
              onDelete={async () => {
                setSelected(null);
                await fetchData();
              }}
            />
          )}
        </>
      )}
    </BrandLayout>
  );
}
