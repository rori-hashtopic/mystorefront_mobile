import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, LogOut } from "lucide-react";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function ShopperSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [shopperName, setShopperName] = useState<string>("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("shopper_profiles")
        .select("name, marketing_consent")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setShopperName(data.name);
        setMarketingConsent(data.marketing_consent);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleMarketingToggle = async (checked: boolean) => {
    if (!user) return;
    setMarketingConsent(checked);

    await supabase.from("shopper_profiles").update({ marketing_consent: checked }).eq("user_id", user.id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <ShopperLayout displayName={shopperName}>
        <div className="py-20 text-center text-muted-foreground text-sm tracking-widest uppercase">Loading…</div>
      </ShopperLayout>
    );
  }

  return (
    <ShopperLayout displayName={shopperName}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        {/* Header */}
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Account</p>
        <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tight mb-6">Settings</h1>
        <div className="h-px bg-border mb-10" />

        {/* Profile Info */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Profile</p>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{shopperName || "—"}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email || "—"}</span>
            </div>
          </div>
        </section>

        <div className="h-px bg-border mb-10" />

        {/* Marketing Preferences */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Preferences</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email updates</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive product picks and creator highlights</p>
            </div>
            <Switch checked={marketingConsent} onCheckedChange={handleMarketingToggle} />
          </div>
        </section>

        <div className="h-px bg-border mb-10" />

        {/* Become a Creator */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Account Type</p>
          <h2 className="font-display text-2xl sm:text-3xl font-light tracking-tight mb-3">Become a Creator</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md">
            Apply to join MyStorefront as a creator. Once approved,you'll unlock affiliate links, your own storefront,
            and commissions on sales you inspire.
          </p>
          <button
            onClick={() => navigate("/become-a-creator")}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
          >
            Apply to become a Creator
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>

        <div className="h-px bg-border mb-10" />

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 group"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </motion.div>
    </ShopperLayout>
  );
}
