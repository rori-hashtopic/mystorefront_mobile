import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Plus, ExternalLink } from "lucide-react";
import { demoGiftCampaigns, getCreator, formatZAR } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  shipped: "bg-violet-100 text-violet-700",
  posted: "bg-emerald-100 text-emerald-700",
};

export default function DemoBrandGifting() {
  const { demoAction } = useDemoMode();

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="paid" />
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Gifting</h1>
            <p className="text-muted-foreground">
              Manage PR sends and product seeding to creators.
            </p>
          </div>
          <Button onClick={() => demoAction("Demo — campaign creation disabled.")}>
            <Plus className="h-4 w-4 mr-2" /> New campaign
          </Button>
        </div>

        <div className="space-y-6">
          {demoGiftCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" /> {campaign.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.product_name} · {formatZAR(campaign.product_value)} value
                    </p>
                  </div>
                  <Badge variant="default">{campaign.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{campaign.description}</p>
              </CardHeader>
              <CardContent>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Requests ({campaign.requests.length})
                </p>
                <div className="divide-y divide-border">
                  {campaign.requests.map((req) => {
                    const c = getCreator(req.creator_id);
                    return (
                      <div key={req.id} className="flex items-center gap-3 py-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={c?.photo_url || undefined} />
                          <AvatarFallback>{c?.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {c?.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{c?.instagram_username}
                            {req.tracking && (
                              <>
                                {" · Tracking "}
                                <span className="font-mono">{req.tracking}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusColor[req.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {req.status}
                        </span>
                        {(req as any).post_url && (
                          <a
                            href={(req as any).post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-foreground inline-flex items-center gap-1 hover:underline"
                            onClick={(e) => e.preventDefault()}
                          >
                            View post <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoBrandLayout>
  );
}
