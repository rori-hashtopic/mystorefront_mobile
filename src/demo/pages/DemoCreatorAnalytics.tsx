import { useParams, Link } from "react-router-dom";
import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Instagram, Users, Heart, MessageCircle, MapPin, TrendingUp } from "lucide-react";
import { getCreator, demoOrders, demoClicks, formatZAR } from "@/demo/mockData";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DemoCreatorAnalytics() {
  const { creatorId = "" } = useParams();
  const creator = getCreator(creatorId);

  if (!creator) {
    return (
      <DemoBrandLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Creator not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/demo/brand/creators">Back to creators</Link>
          </Button>
        </div>
      </DemoBrandLayout>
    );
  }

  // Generate a mock 6-month follower growth
  const growthData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const base = creator.follower_count - (5 - i) * Math.floor(creator.follower_count * 0.04);
    return {
      month: month.toLocaleString("en-ZA", { month: "short" }),
      followers: base,
    };
  });

  const creatorOrders = demoOrders.filter((o) => o.creator_id === creator.id);
  const creatorClicks = demoClicks.filter((c) => c.creator_id === creator.id);
  const totalSales = creatorOrders.reduce((s, o) => s + o.order_total, 0);
  const totalCommission = creatorOrders.reduce((s, o) => s + o.commission_amount, 0);

  // Mock top posts
  const topPosts = [
    { id: "p1", caption: "Morning routine with my favourite serum", likes: Math.round(creator.avg_likes * 1.6), comments: Math.round(creator.avg_comments * 1.4) },
    { id: "p2", caption: "Honest review — 30 days in", likes: Math.round(creator.avg_likes * 1.3), comments: Math.round(creator.avg_comments * 1.2) },
    { id: "p3", caption: "Outdoor shoot in the Karoo", likes: Math.round(creator.avg_likes * 1.1), comments: Math.round(creator.avg_comments * 0.9) },
  ];

  // Mock audience demographics
  const ageGroups = [
    { label: "18-24", value: 28 },
    { label: "25-34", value: 41 },
    { label: "35-44", value: 19 },
    { label: "45+", value: 12 },
  ];
  const genderSplit = [
    { label: "Female", value: 68 },
    { label: "Male", value: 30 },
    { label: "Other", value: 2 },
  ];
  const topCities = [
    { label: "Cape Town", value: 32 },
    { label: "Johannesburg", value: 28 },
    { label: "Durban", value: 14 },
    { label: "Pretoria", value: 9 },
  ];

  return (
    <DemoBrandLayout>
      <div className="space-y-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/demo/brand/creators">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to creators
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={creator.photo_url || undefined} />
            <AvatarFallback className="text-3xl">{creator.display_name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground">{creator.display_name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Instagram className="h-4 w-4" />@{creator.instagram_username}
              <span>·</span>
              <MapPin className="h-3.5 w-3.5" />
              {creator.location_tags.join(", ")}
            </p>
            <p className="text-foreground mt-3 max-w-xl">{creator.bio}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary">{creator.tier}</Badge>
              {creator.niche_tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <Button asChild>
            <Link to="/demo/brand/messages">Message creator</Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Followers" value={creator.follower_count.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
          <Kpi label="Engagement" value={`${creator.engagement_rate}%`} icon={<Heart className="h-4 w-4 text-muted-foreground" />} />
          <Kpi label="Avg Likes" value={creator.avg_likes.toLocaleString()} icon={<Heart className="h-4 w-4 text-muted-foreground" />} />
          <Kpi label="Avg Comments" value={creator.avg_comments.toLocaleString()} icon={<MessageCircle className="h-4 w-4 text-muted-foreground" />} />
        </div>

        {/* Performance for this brand */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Performance for Demo Brand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Clicks driven" value={creatorClicks.length.toString()} />
              <Stat label="Orders" value={creatorOrders.length.toString()} />
              <Stat label="Total Sales" value={formatZAR(totalSales)} />
              <Stat label="Commission" value={formatZAR(totalCommission)} />
            </div>
          </CardContent>
        </Card>

        {/* Growth chart */}
        <Card>
          <CardHeader>
            <CardTitle>Follower growth (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="followers"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPosts.map((p) => (
                <div key={p.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="aspect-square bg-secondary flex items-center justify-center">
                    <Instagram className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-foreground line-clamp-2">{p.caption}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {p.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {p.comments.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audience demographics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DemographicCard title="Age groups" data={ageGroups} />
          <DemographicCard title="Gender" data={genderSplit} />
          <DemographicCard title="Top cities" data={topCities} />
        </div>
      </div>
    </DemoBrandLayout>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DemographicCard({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-foreground">{row.label}</span>
              <span className="text-muted-foreground">{row.value}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full"
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
