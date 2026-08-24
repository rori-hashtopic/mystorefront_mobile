import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Wifi, WifiOff, Copy, Cookie, Link2, Store } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShopifyDiscountSyncCard } from "@/components/brand/ShopifyDiscountSyncCard";
import { WooCommerceDiscountSyncCard } from "@/components/brand/WooCommerceDiscountSyncCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TrackingIntegrationCardProps {
  brandId: string | null;
  trackingStatus: string;
  lastPostbackAt: {
    shopify: string | null;
    woo: string | null;
  };
  webhookSecret: string | null;
  onWebhookSecretChange: (secret: string) => void;
}

export function TrackingIntegrationCard({
  brandId,
  trackingStatus,
  lastPostbackAt,
  webhookSecret,
  onWebhookSecretChange,
}: TrackingIntegrationCardProps) {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<"woocommerce" | "shopify">("woocommerce");

  const postbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-postback`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  // 🔥 unified lastActive logic
  const lastActive = platform === "shopify" ? lastPostbackAt?.shopify : lastPostbackAt?.woo;

  const getTrackingStatusDisplay = () => {
    if (lastActive) {
      return {
        label: "Connected",
        color: "text-green-600",
        icon: Wifi,
      };
    }
    return {
      label: "Not connected",
      color: "text-muted-foreground",
      icon: WifiOff,
    };
  };

  const statusDisplay = getTrackingStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Tracking & Integration
        </CardTitle>
        <CardDescription>Set up automatic affiliate sale tracking for your online store.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Platform Selector */}
        <div className="flex gap-2">
          <Button
            variant={platform === "woocommerce" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("woocommerce")}
          >
            WooCommerce
          </Button>
          <Button
            variant={platform === "shopify" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("shopify")}
          >
            Shopify
          </Button>
        </div>

        {/* Shopify Setup */}
        {platform === "shopify" && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="setup-guide" className="border rounded-xl px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#95BF47]/10">
                    <Store className="h-5 w-5 text-[#95BF47]" />
                  </div>
                  <span className="font-medium text-left">Shopify App Setup Guide</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  Install app → paste webhook URL + secret → send test postback
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Config */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={postbackUrl} className="font-mono text-xs" />
              <Button onClick={() => copyToClipboard(postbackUrl, "Webhook URL")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookSecret || "Not configured"} className="font-mono text-xs" />
              {webhookSecret ? (
                // Once a secret exists, only allow copying it. Regenerating would
                // invalidate the secret already pasted into the store plugin.
                <Button
                  type="button"
                  variant="outline"
                  title="Copy webhook secret"
                  onClick={() => copyToClipboard(webhookSecret, "Webhook Secret")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={async () => {
                    if (!brandId) return;
                    const secret = crypto.randomUUID();
                    const { error } = await supabase
                      .from("brand_accounts")
                      .update({ webhook_secret: secret } as any)
                      .eq("id", brandId);
                    if (error) {
                      toast({
                        title: "Error",
                        description: "Could not generate the secret. Please try again.",
                        variant: "destructive",
                      });
                      return;
                    }
                    onWebhookSecretChange(secret);
                    copyToClipboard(secret, "Webhook Secret");
                  }}
                >
                  Generate
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="flex justify-between p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                lastActive ? "bg-green-500/10" : webhookSecret ? "bg-yellow-500/10" : "bg-muted"
              }`}
            >
              <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
            </div>

            <div>
              <p className="text-sm font-medium">Tracking Status</p>
              <p className={`text-sm ${statusDisplay.color}`}>{statusDisplay.label}</p>
            </div>
          </div>
        </div>

        {/* LAST ACTIVITY */}
        <div className="flex justify-between p-4 rounded-xl bg-muted/50 border">
          <div>
            <p className="text-sm font-medium">Last postback received</p>
            <p className="text-sm text-muted-foreground">
              {lastActive ? formatDistanceToNow(new Date(lastActive), { addSuffix: true }) : "Never"}
            </p>
          </div>
        </div>

        {/* DISCOUNT CODE SYNC */}
        {platform === "shopify" ? (
          <ShopifyDiscountSyncCard brandId={brandId!} />
        ) : (
          <WooCommerceDiscountSyncCard brandId={brandId!} />
        )}
      </CardContent>
    </Card>
  );
}
