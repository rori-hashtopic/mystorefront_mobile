import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.svg";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
      // If we get a SIGNED_IN event with a session, the recovery token was already exchanged
      if (event === "SIGNED_IN" && session) {
        setIsRecovery(true);
      }
    });

    // Check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Also check if there's already an active session (recovery token already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true);
      } else {
        // If no session after 5 seconds, redirect to auth with error
        timeout = setTimeout(() => {
          navigate("/auth");
          toast({ title: "Invalid or expired link", description: "Please request a new password reset.", variant: "destructive" });
        }, 5000);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password updated", description: "Your password has been reset successfully." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 sm:p-12">
      <motion.div className="w-full max-w-md" initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeIn} className="flex items-center gap-3 mb-12">
          <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
          <span className="text-foreground font-display text-xl">MyStorefront</span>
        </motion.div>

        <motion.div variants={fadeIn} className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Password Reset</p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            Choose a new password
          </h2>
          <p className="text-muted-foreground text-sm mt-3">
            Enter your new password below.
          </p>
        </motion.div>

        <motion.div variants={fadeIn} className="h-px bg-border mb-8" />

        <form onSubmit={handleSubmit}>
          <motion.div variants={stagger} className="space-y-6">
            <motion.div variants={fadeIn} className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-transparent border-b pb-2 pr-10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors text-base ${
                    errors.password ? "border-destructive" : "border-border focus:border-foreground"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </motion.div>

            <motion.div variants={fadeIn} className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-transparent border-b pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors text-base ${
                  errors.confirmPassword ? "border-destructive" : "border-border focus:border-foreground"
                }`}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </motion.div>

            <motion.div variants={fadeIn} className="pt-4">
              <div className="h-px bg-border mb-8" />
              <button
                type="submit"
                disabled={isLoading}
                className="group inline-flex items-center gap-2 text-foreground font-display text-lg tracking-tight hover:opacity-70 transition-opacity disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Update password</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
