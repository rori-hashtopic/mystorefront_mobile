import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, Users, Plus } from "lucide-react";
import { demoMentionCampaigns, formatZAR } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

export default function DemoBrandMentions() {
  const { demoAction } = useDemoMode();

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="paid" />
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mentions</h1>
            <p className="text-muted-foreground">
              Pay creators fixed fees for guaranteed social mentions.
            </p>
          </div>
          <Button onClick={() => demoAction("Demo — campaign creation disabled.")}>
            <Plus className="h-4 w-4 mr-2" /> New campaign
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoMentionCampaigns.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base leading-snug">{c.title}</CardTitle>
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>

                <div className="flex items-center gap-1 text-xs">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{c.deliverable_type}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-foreground">{formatZAR(c.fee_amount)}</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {c.content_deadline}</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {c.accepted_count}/{c.max_creators} accepted ({c.requests_count} requests)
                  </span>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => demoAction("Demo — view detail disabled.")}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => demoAction("Demo — invite disabled.")}
                  >
                    Invite creators
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoBrandLayout>
  );
}
