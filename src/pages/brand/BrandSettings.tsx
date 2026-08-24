import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Save, Upload, Image as ImageIcon, Instagram, Mail } from "lucide-react";
import { TrackingIntegrationCard } from "@/components/brand/TrackingIntegrationCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Aligned with the brand onboarding category list so values saved at signup
// render correctly here.
const CATEGORY_OPTIONS = [
  "Fashion & Apparel",
  "Beauty & Wellness",
  "Home & Lifestyle",
  "Jewellery",
  "Electronics",
  "Food & Beverage",
  "Sports & Outdoor",
  "Health & Wellness",
  "Travel & Hospitality",
  "Entertainment & Media",
  "Automotive",
  "Retail & E-commerce",
  "Other",
];

export default function BrandSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand, loading } = useBrandAccount();

  const [brandName, setBrandName] = useState("");
  const [logoUploadUrl, setLogoUploadUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [commissionPercent, setCommissionPercent] = useState<number | "">("");
  const [refundBufferDays, setRefundBufferDays] = useState<number>(30);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  const [accountEmail, setAccountEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.email) setAccountEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (!brand) return;
    setBrandName(brand.name);
    setLogoUploadUrl(brand.logo_upload_url || brand.logo_url || "");
    setWebsiteUrl(brand.website_url || "");
    setCategory(brand.category || "");
    setInstagramUrl(brand.instagram_url || "");
    setTiktokUrl(brand.tiktok_url || "");
    setCommissionPercent(brand.commission_percent ?? "");
    setRefundBufferDays(brand.refund_buffer_days ?? 30);
    setWebhookSecret(brand.webhook_secret || null);
  }, [brand]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!brand) return;
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Invalid file type", description: "PNG, JPG, or SVG only.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
        return;
      }
      setIsUploading(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `${brand.id}/${brand.id}-logo.${ext}`;
        const { error } = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
        setLogoUploadUrl(data.publicUrl);
        toast({ title: "Logo uploaded" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    },
    [brand, toast],
  );

  const handleSave = async () => {
    if (!user) return;

    // Required fields: website, commission rate, and refund buffer.
    const website = websiteUrl.trim();
    if (!website) {
      toast({ title: "Website required", description: "Add your brand's website URL.", variant: "destructive" });
      return;
    }
    const commission = Number(commissionPercent);
    if (commissionPercent === "" || !Number.isFinite(commission) || commission < 0 || commission > 100) {
      toast({
        title: "Commission rate required",
        description: "Enter a commission percentage between 0 and 100.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isInteger(refundBufferDays) || refundBufferDays < 0) {
      toast({
        title: "Refund buffer required",
        description: "Enter the refund buffer as a whole number of days (0 or more).",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("brand_accounts")
        .update({
          name: brandName,
          logo_upload_url: logoUploadUrl || null,
          website_url: website,
          category: category || null,
          instagram_url: instagramUrl || null,
          tiktok_url: tiktokUrl || null,
          commission_percent: commission,
          refund_buffer_days: refundBufferDays,
        } as any)
        .eq("owner_user_id", user.id);
      if (error) throw error;
      toast({ title: "Settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (email === accountEmail.toLowerCase()) {
      toast({ title: "No change", description: "That is already your login email." });
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/brand/settings` },
      );
      if (error) throw error;
      toast({
        title: "Confirmation sent",
        description: `Check ${email} and ${accountEmail} for a confirmation link. Your login email updates once confirmed.`,
      });
      setNewEmail("");
    } catch (err: any) {
      toast({ title: "Could not update email", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Settings</h1>
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
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Brand logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                  {logoUploadUrl ? (
                    <img src={logoUploadUrl} alt="Brand logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-foreground hover:underline">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload new logo
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Brand name" value={brandName} onChange={setBrandName} />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {category && !CATEGORY_OPTIONS.includes(category) && (
                      <SelectItem value={category}>{category}</SelectItem>
                    )}
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Website"
                value={websiteUrl}
                onChange={setWebsiteUrl}
                placeholder="https://example.com"
                required
              />
              <Field
                label="Instagram"
                value={instagramUrl}
                onChange={setInstagramUrl}
                placeholder="https://instagram.com/yourbrand"
                icon={<Instagram className="h-4 w-4" />}
              />
              <Field
                label="TikTok"
                value={tiktokUrl}
                onChange={setTiktokUrl}
                placeholder="https://tiktok.com/@yourbrand"
              />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Refund buffer (days)<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={refundBufferDays}
                  onChange={(e) => setRefundBufferDays(Number(e.target.value || 0))}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Commission rate (%)<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className="mt-1"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account / Login email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Account
            </CardTitle>
            <CardDescription>
              Change the email address you use to log in. We'll send a confirmation link to your new address. Your login
              email updates once you click it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current login email</Label>
                <Input className="mt-1" value={accountEmail} disabled readOnly />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">New email</Label>
                <Input
                  type="email"
                  className="mt-1"
                  placeholder="you@brand.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleUpdateEmail}
                disabled={isUpdatingEmail || !newEmail.trim()}
                className="w-full sm:w-auto"
              >
                {isUpdatingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send confirmation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tracking & API */}
        {brand && (
          <TrackingIntegrationCard
            brandId={brand.id}
            trackingStatus={webhookSecret ? "connected" : "not_connected"}
            lastPostbackAt={{
              shopify: brand.shopify_last_postback_at,
              woo: brand.woocommerce_last_postback_at,
            }}
            webhookSecret={webhookSecret}
            onWebhookSecretChange={setWebhookSecret}
          />
        )}
      </div>
    </BrandLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative mt-1">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={icon ? "pl-10" : ""}
        />
      </div>
    </div>
  );
}
