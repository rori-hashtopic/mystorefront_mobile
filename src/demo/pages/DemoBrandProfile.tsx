import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Globe, Instagram, ExternalLink, Edit3 } from "lucide-react";
import { demoBrand } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";

export default function DemoBrandProfile() {
  const { demoAction } = useDemoMode();

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Brand profile</h1>
            <p className="text-muted-foreground">
              How creators see your brand on MyStorefront.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => demoAction("Demo — profile editing disabled.")}
          >
            <Edit3 className="h-4 w-4 mr-2" /> Edit profile
          </Button>
        </div>

        {/* Hero / preview */}
        <Card className="overflow-hidden">
          <div className="aspect-[3/1] bg-gradient-to-br from-secondary to-muted relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--foreground)/0.05),transparent_70%)]" />
            <div className="absolute bottom-6 left-6 flex items-end gap-4">
              <Avatar className="h-20 w-20 border-4 border-card shadow">
                <AvatarFallback className="text-2xl bg-foreground text-background">
                  {demoBrand.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {demoBrand.name}
                </h2>
                <Badge variant="secondary" className="mt-1">
                  {demoBrand.category}
                </Badge>
              </div>
            </div>
          </div>
          <CardContent className="pt-6">
            <p className="text-foreground max-w-2xl">{demoBrand.description}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <a
                href={demoBrand.website_url}
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1.5 text-foreground hover:underline"
              >
                <Globe className="h-4 w-4" /> {demoBrand.website_url.replace("https://", "")}
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={demoBrand.instagram_url}
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1.5 text-foreground hover:underline"
              >
                <Instagram className="h-4 w-4" /> @demobrand.za
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats creators see */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Commission" value={`${demoBrand.commission_percent}%`} />
          <Stat label="Refund window" value={`${demoBrand.refund_buffer_days} days`} />
          <Stat label="Category" value={demoBrand.category} />
          <Stat label="Country" value="South Africa 🇿🇦" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> What creators see
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your brand appears on the Explore page with the hero image, description, and
              commission percentage shown above.
            </p>
            <p>
              Creators can request to partner with you, save your products to their storefront, and
              redeem assigned discount codes — all attributed back through your tracking pixel.
            </p>
          </CardContent>
        </Card>
      </div>
    </DemoBrandLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
