import { Link } from "react-router-dom";
import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Bookmark, MessageSquare, Tag, Gift, Megaphone } from "lucide-react";
import {
  demoBrand,
  demoCreators,
  demoSavedLists,
  demoConversations,
  demoMessageRequests,
  demoOrders,
  demoMentionCampaigns,
  demoGiftCampaigns,
  formatZAR,
} from "@/demo/mockData";
import { AppFooter } from "@/components/layout/AppFooter";

export default function DemoBrandDashboard() {
  const totalCreators = demoCreators.length;
  const savedCount = new Set(demoSavedLists.flatMap((l) => l.creator_ids)).size;
  const activeCampaigns =
    demoMentionCampaigns.filter((c) => c.status === "active").length +
    demoGiftCampaigns.filter((c) => c.status === "active").length;
  const last30 = demoOrders.filter(
    (o) => new Date(o.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  const last30Sales = last30.reduce((s, o) => s + o.order_total, 0);
  const unread = demoConversations.reduce((s, c) => s + c.unread, 0) + demoMessageRequests.length;

  return (
    <DemoBrandLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome, {demoBrand.name}
          </h1>
          <p className="text-muted-foreground">
            Discover and connect with creators that match your brand.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discoverable Creators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCreators}</div>
              <p className="text-xs text-muted-foreground">In your reach</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Creators</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savedCount}</div>
              <p className="text-xs text-muted-foreground">Across {demoSavedLists.length} lists</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">Mentions + gifting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30d Sales</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatZAR(last30Sales)}</div>
              <p className="text-xs text-muted-foreground">{last30.length} orders</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Discover Creators</CardTitle>
              <CardDescription>
                Search and filter creators by niche, location, and engagement metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/demo/brand/creators">Browse Creators</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Track clicks, orders, and top performing creators.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/demo/brand/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Recent activity</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              <ActivityRow
                icon={<MessageSquare className="h-4 w-4" />}
                title={`${unread} new messages`}
                description="From creators across active campaigns"
                href="/demo/brand/messages"
              />
              <ActivityRow
                icon={<Megaphone className="h-4 w-4" />}
                title="Botanical Serum mentions campaign"
                description="3 creators applied, 2 accepted"
                href="/demo/brand/mentions"
              />
              <ActivityRow
                icon={<Gift className="h-4 w-4" />}
                title="Recovery Cream PR send"
                description="2 posted, 1 shipped, 1 pending"
                href="/demo/brand/gifting"
              />
              <ActivityRow
                icon={<Tag className="h-4 w-4" />}
                title="LERATO20 discount code"
                description="47 redemptions this month"
                href="/demo/brand/discount-codes"
              />
            </CardContent>
          </Card>
        </div>

        <AppFooter />
      </div>
    </DemoBrandLayout>
  );
}

function ActivityRow({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link to={href} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
