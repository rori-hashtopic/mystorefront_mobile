import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle2, AlertCircle, Building2, Link2, ShoppingBag } from "lucide-react";
import { demoBrand } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";

export default function DemoBrandSettings() {
  const { demoAction } = useDemoMode();

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Brand identity, integrations, and preferences.</p>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Brand identity
            </CardTitle>
            <CardDescription>How your brand appears across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Brand name" value={demoBrand.name} />
              <Field label="Category" value={demoBrand.category} />
              <Field label="Website" value={demoBrand.website_url} />
              <Field label="Instagram" value={demoBrand.instagram_url} />
              <Field label="TikTok" value={demoBrand.tiktok_url} />
              <Field label="Refund buffer (days)" value={String(demoBrand.refund_buffer_days)} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <p className="mt-1 text-sm text-foreground">{demoBrand.description}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => demoAction("Demo — saving disabled.")}>
                <Save className="h-4 w-4 mr-2" /> Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tracking integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Tracking & API
            </CardTitle>
            <CardDescription>Postback URL and API key for sale attribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Tracking connected</span>
                <span className="text-emerald-600">·</span>
                <span className="text-emerald-600">
                  Last postback {new Date(demoBrand.shopify_last_postback_at).toLocaleString()}
                </span>
              </div>
              <Badge variant="secondary">Live</Badge>
            </div>
            <Field label="API key" value={demoBrand.api_key_masked} mono />
            <Field
              label="Webhook secret"
              value="whsec_••••••••••••••••••a4f2"
              mono
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => demoAction("Demo — key rotation disabled.")}
            >
              Rotate keys
            </Button>
          </CardContent>
        </Card>

        {/* Shopify */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Shopify
            </CardTitle>
            <CardDescription>Sync discount codes and order tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Connected</span>
                <span className="text-emerald-600">·</span>
                <span className="text-emerald-600">{demoBrand.shop_domain}</span>
              </div>
              <Badge variant="secondary">Verified</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Discount codes you create here are pushed to Shopify automatically. Orders attributed
              to a creator's affiliate link create commission entries.
            </p>
          </CardContent>
        </Card>

        {/* WooCommerce */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> WooCommerce
            </CardTitle>
            <CardDescription>Optional secondary store integration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Not connected</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => demoAction("Demo — connection disabled.")}
              >
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoBrandLayout>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        value={value}
        readOnly
        className={`mt-1 ${mono ? "font-mono text-xs" : ""}`}
      />
    </div>
  );
}
