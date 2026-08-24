import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

interface RoleOption {
  id: AppRole;
  title: string;
  description: string;
  disabled?: boolean;
  note?: string;
}

const roles: RoleOption[] = [
  { id: "shopper", title: "Shopper", description: "Launching soon", disabled: true },
  { id: "creator", title: "Creator", description: "Launching soon", disabled: true },
  { id: "brand", title: "Brand", description: "Invite only — roxi@mystorefront.io", disabled: true },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { assignRole } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [shopperName, setShopperName] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);

  const handleSelectRole = async () => {
    if (!selectedRole || !user) return;

    if (selectedRole === "shopper" && !shopperName.trim()) {
      toast({ title: "Name required", description: "Please enter your name", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error: roleError } = await assignRole(selectedRole);
      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          marketing_consent: marketingConsent,
          marketing_consent_updated_at: marketingConsent ? new Date().toISOString() : null,
        })
        .eq("id", user.id);

      if (profileError) console.error("Error updating profile consent:", profileError);

      if (selectedRole === "shopper") {
        const { error: shopperError } = await supabase
          .from("shopper_profiles")
          .insert({ user_id: user.id, name: shopperName, marketing_consent: marketingConsent });
        if (shopperError) throw shopperError;
      }

      toast({
        title: "Account setup complete!",
        description: "Welcome to MyStorefront!",
      });

      if (selectedRole === "creator") navigate("/");
      else if (selectedRole === "shopper") navigate("/explore");
    } catch (error: any) {
      console.error("Error setting up account:", error);
      toast({ title: "Error", description: error.message || "Failed to set up account", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <motion.div
        className="w-full max-w-lg"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Headline */}
        <motion.div variants={fadeIn} className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Get Started
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-foreground">
            How will you use MyStorefront?
          </h1>
        </motion.div>

        <motion.div variants={fadeIn} className="h-px bg-border" />

        {/* Role Options */}
        <div>
          {roles.map((role) => (
            <motion.div key={role.id} variants={fadeIn}>
              <button
                type="button"
                disabled={role.disabled}
                onClick={() => !role.disabled && setSelectedRole(role.id)}
                className={`w-full text-left py-8 group transition-colors duration-200 ${
                  role.disabled ? "cursor-default opacity-50" : "cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex-1 ${selectedRole === role.id ? "pl-4 border-l-2 border-foreground" : ""}`}>
                    <h2
                      className={`font-display text-2xl sm:text-3xl tracking-tight transition-colors ${
                        role.disabled
                          ? "text-muted-foreground italic"
                          : selectedRole === role.id
                          ? "text-foreground"
                          : "text-foreground/70 group-hover:text-foreground"
                      }`}
                    >
                      {role.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {role.description}
                    </p>
                    {role.note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {role.note}
                      </p>
                    )}
                  </div>
                  {!role.disabled && (
                    <ArrowRight
                      className={`h-5 w-5 mt-2 shrink-0 transition-all duration-200 ${
                        selectedRole === role.id
                          ? "text-foreground translate-x-0 opacity-100"
                          : "text-muted-foreground -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      }`}
                    />
                  )}
                </div>
              </button>
              <div className="h-px bg-border" />
            </motion.div>
          ))}
        </div>

        {/* Shopper Name Input */}
        {selectedRole === "shopper" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="py-8 space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors text-lg"
              />
            </div>
            <div className="h-px bg-border" />
          </motion.div>
        )}

        {/* Marketing Consent */}
        {selectedRole && selectedRole !== "brand" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="py-6"
          >
            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketingConsent"
                checked={marketingConsent}
                onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                className="mt-0.5"
              />
              <div>
                <Label
                  htmlFor="marketingConsent"
                  className="text-sm text-muted-foreground font-normal cursor-pointer"
                >
                  Send me updates about my wishlist and new finds.
                </Label>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You can unsubscribe at any time.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Continue CTA */}
        {selectedRole && selectedRole !== "brand" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="pt-4"
          >
            <button
              onClick={handleSelectRole}
              disabled={isLoading || !selectedRole}
              className="group inline-flex items-center gap-2 text-foreground font-display text-lg tracking-tight hover:opacity-70 transition-opacity disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
