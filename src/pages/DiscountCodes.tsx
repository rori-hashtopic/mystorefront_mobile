import { useState, useEffect, useCallback } from "react";
import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Tag, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface CreatorDiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expiry_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  brand_id: string;
}

interface BrandInfo {
  id: string;
  name: string;
  logo_url: string | null;
  logo_upload_url: string | null;
}

export default function DiscountCodes() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [codes, setCodes] = useState<CreatorDiscountCode[]>([]);
  const [brands, setBrands] = useState<Record<string, BrandInfo>>({});
  const [codesLoading, setCodesLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tier = profile?.tier || "enthusiast";
  const displayName = profile?.display_name;

  const fetchCodes = useCallback(async () => {
    if (!user) return;
    setCodesLoading(true);
    const { data } = await supabase
      .from("discount_codes" as any)
      .select("id, code, discount_type, discount_value, expiry_date, usage_limit, usage_count, brand_id")
      .eq("creator_id", user.id)
      .eq("is_active", true);

    const typedCodes = (data || []) as unknown as CreatorDiscountCode[];
    setCodes(typedCodes);

    const brandIds = [...new Set(typedCodes.map(c => c.brand_id))];
    if (brandIds.length > 0) {
      const { data: brandsData } = await supabase
        .from("brand_accounts")
        .select("id, name, logo_url, logo_upload_url")
        .in("id", brandIds);
      if (brandsData) {
        const map: Record<string, BrandInfo> = {};
        (brandsData as BrandInfo[]).forEach(b => { map[b.id] = b; });
        setBrands(map);
      }
    }
    setCodesLoading(false);
  }, [user]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar
        tier={tier}
        displayName={displayName}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Discount Codes</h1>
            <p className="text-muted-foreground mt-1">Codes assigned to you by brands for sharing with your audience.</p>
          </div>

          {codesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No discount codes yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Brands will assign codes to you when running campaigns.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {codes.map(code => {
                const brand = brands[code.brand_id];
                const daysUntilExpiry = code.expiry_date ? differenceInDays(new Date(code.expiry_date), new Date()) : null;
                const expiringWarning = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
                const usesLeft = code.usage_limit ? code.usage_limit - code.usage_count : null;
                const discountText = code.discount_type === "percentage"
                  ? `${code.discount_value}% off`
                  : `R${Number(code.discount_value).toFixed(0)} off`;

                return (
                  <Card key={code.id} className="relative">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xl font-bold text-foreground">{code.code}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleCopy(code.id, code.code)}
                        >
                          {copiedId === code.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === code.id ? "Copied!" : "Copy"}
                        </Button>
                      </div>

                      {brand && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={brand.logo_upload_url || brand.logo_url || undefined} />
                            <AvatarFallback className="text-[10px]">{brand.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{brand.name}</span>
                        </div>
                      )}

                      <Badge variant="secondary" className="text-sm">{discountText}</Badge>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {code.expiry_date && (
                          <span className={expiringWarning ? "text-amber-600 font-medium flex items-center gap-1" : ""}>
                            {expiringWarning && <AlertTriangle className="h-3 w-3" />}
                            Expires {format(new Date(code.expiry_date), "dd MMM yyyy")}
                          </span>
                        )}
                        <span>{usesLeft !== null ? `${usesLeft} uses left` : "Unlimited uses"}</span>
                      </div>

                      {brand && (
                        <p className="text-xs text-muted-foreground">
                          Share this code with your audience when recommending {brand.name} products.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
