import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";

interface InviteInfo {
  brand_id: string;
  brand_name: string;
  brand_logo_url: string | null;
  welcome_message: string | null;
  status: "active" | "redeemed" | "revoked" | "expired";
  expires_at: string;
  invited_email: string | null;
  invited_name: string | null;
}

async function callInvite(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("brand-creator-invite", { body });
  if (error) {
    const ctx = (error as any).context;
    const payload = await ctx
      ?.clone()
      .json()
      .catch(() => null);
    return { data: null, error: payload?.error || error.message, code: payload?.code };
  }
  if (data?.error) return { data: null, error: data.error as string, code: data.code };
  return { data, error: null, code: null };
}

export default function BrandInviteLanding() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("This invite link is missing its token.");
        setLoading(false);
        return;
      }
      const { data, error } = await callInvite({ action: "validate", token });
      if (error || !data) {
        setError(error || "This invite is no longer valid.");
      } else {
        const info = data.invite as InviteInfo;
        setInvite(info);
        // The invite is bound to this address server-side, so prefill it and
        // don't make the creator retype what we already know.
        if (info.invited_email) setEmail(info.invited_email);
        if (info.invited_name) setName(info.invited_name);
        if (data.invite.status !== "active") {
          setError(
            data.invite.status === "redeemed"
              ? "This invite has already been used."
              : data.invite.status === "revoked"
                ? "This invite has been revoked."
                : "This invite has expired.",
          );
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (!tosAccepted) {
      toast({ title: "Please accept the Terms to continue", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error, code } = await callInvite({
      action: "signup",
      token,
      email,
      password,
      display_name: name,
    });
    if (error) {
      if (code === "exists") {
        setAlreadyMember(true);
        setSubmitting(false);
        return;
      }
      toast({ title: "Couldn't create account", description: error, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Sign in the new user, then send them to /shop where onboarding wizard runs
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (data?.email as string) || email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      toast({
        title: "Account created — please log in",
        description: "Use your new email and password to sign in.",
      });
      navigate("/auth", { replace: true });
      return;
    }
    toast({
      title: `Welcome — you're connected to ${invite.brand_name}`,
      description: "Finish setting up your creator profile.",
    });
    navigate("/shop", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-10">
          <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
          <span className="font-display text-xl text-foreground">MyStorefront</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Validating invite…
          </div>
        ) : error ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Brand invite</p>
            <h2 className="font-display text-3xl text-foreground mb-4">Invite unavailable</h2>
            <p className="text-muted-foreground">{error}</p>
            <Link to="/auth" className="mt-8 inline-flex items-center gap-2 text-sm text-foreground underline">
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : alreadyMember ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Already a member</p>
            <h2 className="font-display text-3xl text-foreground mb-4">You already have a MyStorefront account</h2>
            <p className="text-muted-foreground mb-6">
              Log in and message {invite?.brand_name} directly from your inbox to connect.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Log in</Link>
            </Button>
          </div>
        ) : invite ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {invite.brand_logo_url && (
                <img
                  src={invite.brand_logo_url}
                  alt={invite.brand_name}
                  className="h-12 w-12 rounded-full object-cover border border-border"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Brand invite</p>
                <h2 className="font-display text-2xl text-foreground">{invite.brand_name} invited you</h2>
              </div>
            </div>

            {invite.welcome_message && (
              <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground italic">
                "{invite.welcome_message}"
              </blockquote>
            )}

            <p className="text-sm text-muted-foreground">
              To connect with {invite.brand_name}, apply for a MyStorefront creator account. Once approved by our team,
              you'll be automatically connected.
            </p>

            <Button asChild className="w-full">
              <Link to="/become-a-creator">
                Apply to become a creator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Already have an account?{" "}
              <Link to="/auth" className="text-foreground underline">
                Log in
              </Link>
            </p>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
