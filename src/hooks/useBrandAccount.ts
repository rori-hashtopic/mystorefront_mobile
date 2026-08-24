import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BrandAccountSummary {
  id: string;
  name: string;
  slug: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  plan_tier: "free" | "premium";
  category: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  description: string | null;
  logo_url: string | null;
  logo_upload_url: string | null;
  hero_image_url: string | null;
  commission_percent: number | null;
  refund_buffer_days: number | null;
  mystorefront_api_key: string | null;
  webhook_secret: string | null;
  shopify_last_postback_at: string | null;
  woocommerce_last_postback_at: string | null;
}

export function useBrandAccount() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setBrand(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("get_own_brand_account");
      if (cancelled) return;
      const row = (data as any)?.[0] ?? null;
      setBrand(row as BrandAccountSummary | null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { brand, loading };
}
