import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import logo from "@/assets/logo.svg";
import authHero from "@/assets/auth-hero.png";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
});

type RoleType = "creator" | "shopper" | null;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") as RoleType;

  const [selectedRole, setSelectedRole] = useState<RoleType>(initialRole);
  const initialMode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLogin && initialRole === "creator") {
      navigate("/become-a-creator", { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });
  }, [initialRole, isLogin, navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        authSchema.pick({ email: true, password: true }).parse({ email, password });
      } else {
        authSchema.parse({ email, password, displayName });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });

        if (data.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

          if (roleData?.role === "creator") navigate("/shop");
          else if (roleData?.role === "shopper") navigate("/explore");
          else if (roleData?.role === "brand") navigate("/brand");
          else if (roleData?.role === "admin") navigate("/admin");
          else navigate("/");
        }
        return;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?pending_role=${selectedRole}`,
            data: { display_name: displayName },
          },
        });
        if (authError) throw authError;

        // Check if email confirmation is required (user exists but session is null)
        if (authData.user && !authData.session) {
          // Email confirmation required — assign role and consent, then show message
          if (selectedRole === "shopper") {
            const { error: roleError } = await supabase.from("user_roles").insert({
              user_id: authData.user.id,
              role: "shopper",
            });
            if (roleError) console.error("Error assigning role:", roleError);

            const { error: profileError } = await supabase
              .from("shopper_profiles")
              .insert({ user_id: authData.user.id, name: displayName, marketing_consent: marketingConsent });
            if (profileError) console.error("Error creating shopper profile:", profileError);
          }

          toast({
            title: "Check your email",
            description: "We've sent a confirmation link to " + email + ". Please verify your email to sign in.",
          });
          setSelectedRole(null);
          setEmail("");
          setPassword("");
          setDisplayName("");
          setIsLogin(true);
          return;
        }

        if (authData.user && selectedRole === "shopper") {
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: authData.user.id,
            role: "shopper",
          });
          if (roleError) console.error("Error assigning role:", roleError);

          const { error: consentError } = await supabase
            .from("profiles")
            .update({
              marketing_consent: marketingConsent,
              marketing_consent_updated_at: marketingConsent ? new Date().toISOString() : null,
            })
            .eq("id", authData.user.id);
          if (consentError) console.error("Error updating marketing consent:", consentError);

          const { error: profileError } = await supabase
            .from("shopper_profiles")
            .insert({ user_id: authData.user.id, name: displayName, marketing_consent: marketingConsent });
          if (profileError) console.error("Error creating shopper profile:", profileError);

          toast({ title: "Account created!", description: "Welcome to MyStorefront." });
          navigate("/explore");
          return;
        }

        toast({ title: "Account created!", description: "Welcome to MyStorefront." });
        navigate("/");
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes("User already registered")) {
        message = "An account with this email already exists. Try logging in instead.";
      } else if (message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { id: "shopper" as const, title: "Shopper", description: "Save products and follow creators", disabled: false },
    {
      id: "creator" as const,
      title: "Creator",
      description: "Apply to become a MyStorefront creator",
      disabled: false,
    },
  ];

  // Role selection view
  if (!selectedRole && !isLogin) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Left side - branding */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img src={authHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex flex-col justify-center px-16">
            <img src={logo} alt="MyStorefront" className="h-16 w-auto mb-8 rounded-2xl shadow-lg" />
            <h1 className="text-white font-display text-5xl tracking-tight mb-4">MyStorefront</h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed">
              Discover curated products from your favorite creators, or start earning from your recommendations.
            </p>
          </div>
        </div>

        {/* Right side - role selection */}
        <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
          <motion.div className="w-full max-w-lg" initial="hidden" animate="visible" variants={stagger}>
            {/* Mobile logo */}
            <motion.div variants={fadeIn} className="lg:hidden flex items-center gap-3 mb-12">
              <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
              <span className="text-foreground font-display text-xl">MyStorefront</span>
            </motion.div>

            <motion.div variants={fadeIn} className="mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Join Us</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
                How would you like to use MyStorefront?
              </h2>
            </motion.div>

            <motion.div variants={fadeIn} className="h-px bg-border" />

            {/* Role options */}
            {roleOptions.map((role) => (
              <motion.div key={role.id} variants={fadeIn}>
                <button
                  type="button"
                  disabled={role.disabled}
                  onClick={() => {
                    if (role.disabled) return;
                    if (role.id === "creator") navigate("/become-a-creator");
                    else setSelectedRole(role.id);
                  }}
                  className={`w-full text-left py-8 group ${
                    role.disabled ? "cursor-default opacity-50" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3
                        className={`font-display text-2xl tracking-tight transition-colors ${
                          role.disabled
                            ? "text-muted-foreground italic"
                            : "text-foreground/70 group-hover:text-foreground"
                        }`}
                      >
                        {role.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    </div>
                    {!role.disabled && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 shrink-0" />
                    )}
                  </div>
                </button>
                <div className="h-px bg-border" />
              </motion.div>
            ))}

            {/* Brand notice */}
            <motion.div variants={fadeIn} className="py-8">
              <p className="font-display text-xl tracking-tight text-muted-foreground/50 italic">Brand</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invite only - <span className="italic">roxi@mystorefront.io</span>
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="h-px bg-border" />

            <motion.div variants={fadeIn} className="pt-8">
              <p className="text-muted-foreground text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-foreground hover:opacity-70 transition-opacity"
                >
                  Sign in →
                </button>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Forgot password view
  if (isForgotPassword) {
    const handleForgotSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!forgotEmail.trim()) {
        setErrors({ forgotEmail: "Please enter your email address" });
        return;
      }
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We've sent a password reset link to " + forgotEmail,
        });
        setIsForgotPassword(false);
        setIsLogin(true);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-background flex">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img src={authHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex flex-col justify-center px-16">
            <img src={logo} alt="MyStorefront" className="h-16 w-auto mb-8 rounded-2xl shadow-lg" />
            <h1 className="text-white font-display text-5xl tracking-tight mb-4">MyStorefront</h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed">
              Discover curated products from your favorite creators, or start earning from your recommendations.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
          <motion.div className="w-full max-w-md" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeIn} className="lg:hidden flex items-center gap-3 mb-12">
              <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
              <span className="text-foreground font-display text-xl">MyStorefront</span>
            </motion.div>

            <motion.button
              variants={fadeIn}
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrors({});
              }}
              className="flex items-center text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </motion.button>

            <motion.div variants={fadeIn} className="mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Password Reset</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">Reset your password</h2>
              <p className="text-muted-foreground text-sm mt-3">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="h-px bg-border mb-8" />

            <form onSubmit={handleForgotSubmit}>
              <motion.div variants={stagger} className="space-y-6">
                <motion.div variants={fadeIn} className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`w-full bg-transparent border-b pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors text-base ${
                      errors.forgotEmail ? "border-destructive" : "border-border focus:border-foreground"
                    }`}
                  />
                  {errors.forgotEmail && <p className="text-xs text-destructive">{errors.forgotEmail}</p>}
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
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send reset link</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </motion.div>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={authHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <img src={logo} alt="MyStorefront" className="h-16 w-auto mb-8 rounded-2xl shadow-lg" />
          <h1 className="text-white font-display text-5xl tracking-tight mb-4">MyStorefront</h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            {selectedRole === "creator"
              ? "Turn your product recommendations into earnings. Join thousands of creators monetising their influence."
              : "MyStorefront connects South African brands with South African creators who drive product sales through trusted recommendations and curated storefronts."}
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <motion.div className="w-full max-w-md" initial="hidden" animate="visible" variants={stagger}>
          {/* Mobile logo */}
          <motion.div variants={fadeIn} className="lg:hidden flex items-center gap-3 mb-12">
            <img src={logo} alt="MyStorefront" className="h-10 w-auto" />
            <span className="text-foreground font-display text-xl">MyStorefront</span>
          </motion.div>

          {/* Back button */}
          {!isLogin && selectedRole && (
            <motion.button
              variants={fadeIn}
              type="button"
              onClick={() => setSelectedRole(null)}
              className="flex items-center text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </motion.button>
          )}

          <motion.div variants={fadeIn} className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
              {isLogin ? "Welcome Back" : `${selectedRole} Account`}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
              {isLogin ? "Sign in" : "Create your account"}
            </h2>
            <p className="text-muted-foreground text-sm mt-3">
              {isLogin
                ? "Enter your credentials to continue"
                : selectedRole === "creator"
                  ? "Start monetizing your recommendations today"
                  : "Start saving products and following creators"}
            </p>
          </motion.div>

          <motion.div variants={fadeIn} className="h-px bg-border mb-8" />

          <form onSubmit={handleSubmit}>
            <motion.div variants={stagger} className="space-y-6">
              {!isLogin && (
                <motion.div variants={fadeIn} className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full bg-transparent border-b pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors text-base ${
                      errors.displayName ? "border-destructive" : "border-border focus:border-foreground"
                    }`}
                  />
                  {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
                </motion.div>
              )}

              <motion.div variants={fadeIn} className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-transparent border-b pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors text-base ${
                    errors.email ? "border-destructive" : "border-border focus:border-foreground"
                  }`}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </motion.div>

              <motion.div variants={fadeIn} className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Password</label>
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

              {isLogin && (
                <motion.div variants={fadeIn} className="-mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotEmail(email);
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </motion.div>
              )}

              {/* Marketing consent */}
              {!isLogin && (
                <motion.div variants={fadeIn} className="space-y-1 pt-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="marketing-consent"
                      checked={marketingConsent}
                      onCheckedChange={(checked) => setMarketingConsent(!!checked)}
                    />
                    <Label
                      htmlFor="marketing-consent"
                      className="text-sm font-normal leading-tight cursor-pointer text-muted-foreground"
                    >
                      Send me updates about my wishlist and new finds.
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground/70 pl-6">You can unsubscribe at any time.</p>
                </motion.div>
              )}

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
                      <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? "Sign in" : "Create account"}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.div>
            </motion.div>
          </form>

          <motion.div variants={fadeIn} className="mt-10">
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                  if (isLogin) setSelectedRole(null);
                }}
                className="text-foreground hover:opacity-70 transition-opacity"
              >
                {isLogin ? "Sign up →" : "Sign in →"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
