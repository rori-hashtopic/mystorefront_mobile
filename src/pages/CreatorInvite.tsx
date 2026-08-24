import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";
import authHero from "@/assets/auth-hero.png";

interface InviteDetails {
  full_name: string;
  email: string;
  invite_expires_at: string | null;
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: Response }).context;
    const payload = await context
      ?.clone()
      .json()
      .catch(() => null);
    if (payload?.error) return payload.error;
  }
  return error instanceof Error ? error.message : fallback;
}

async function callCreatorInvite(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creator-invite`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { data, error: response.ok ? null : data?.error || "Request failed" };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof DOMException && error.name === "AbortError"
          ? "This is taking too long. Please try again."
          : "Network request failed.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function CreatorInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setAuthReady(true);
    });

    supabase.auth.getSession().finally(() => setAuthReady(true));

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        navigate("/auth?mode=login", { replace: true });
        return;
      }

      const { data, error: validateError } = await callCreatorInvite({ action: "validate", token });

      if (validateError || data?.error) {
        // Invite is expired, used, or invalid — send creator straight to login.
        // Post-login routing will resume onboarding if their account is mid-setup.
        navigate("/auth?mode=login", { replace: true });
        return;
      } else {
        setInvite(data.invite);
      }
      setLoading(false);
    };

    validateInvite();
  }, [token]);

  const completeInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data, error: completeError } = await callCreatorInvite({ action: "complete", token, password });

    if (completeError || data?.error) {
      const message =
        data?.error ||
        completeError ||
        (await getFunctionErrorMessage(completeError, "Invite could not be completed."));
      toast({ title: "Invite could not be completed", description: message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Hydrate a session from the one-shot magic-link OTP the server just minted.
    if (data?.session?.hashed_token) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.session.hashed_token,
        type: data.session.type || "magiclink",
      });
      if (verifyError) {
        toast({
          title: "Account created",
          description: "Please sign in with your new password.",
        });
        navigate("/auth?mode=login", { replace: true });
        return;
      }
    }

    toast({ title: "Creator account activated", description: "Welcome to MyStorefront." });
    navigate(data?.redirectTo || "/shop", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={authHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <img src={logo} alt="MyStorefront" className="h-16 w-auto mb-8 rounded-2xl shadow-lg" />
          <h1 className="text-background font-display text-5xl tracking-tight mb-4">MyStorefront</h1>
          <p className="text-background/80 text-lg max-w-md leading-relaxed">
            Activate your creator account and start building your storefront.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
            <span className="text-foreground font-display text-xl">MyStorefront</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Validating invite…
            </div>
          ) : invite ? (
            <form onSubmit={completeInvite} className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Creator Invite</p>
                <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground mb-4">
                  Welcome, {invite.full_name.split(/\s+/)[0]}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  This invite is tied to {invite.email}. Set a password to activate your creator account.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invite.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 rounded-full p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !authReady}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Activate my creator account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
