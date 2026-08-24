import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, Heart, Mail } from "lucide-react";
import { z } from "zod";

interface ShopperAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  pendingAction?: {
    type: "wishlist" | "follow";
    targetId: string;
    targetName?: string;
  };
}

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function ShopperAuthModal({
  open,
  onOpenChange,
  onSuccess,
  pendingAction,
}: ShopperAuthModalProps) {
  const [mode, setMode] = useState<"choice" | "signup" | "signin">("choice");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const resetForm = () => {
    setMode("choice");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setMarketingConsent(true);
    setErrors({});
    setIsLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse({ name, email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?pending_role=shopper`,
          data: {
            display_name: name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user && !authData.session) {
        // Email confirmation required
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "shopper",
        });
        if (roleError) console.error("Error assigning role:", roleError);

        const { error: profileError } = await supabase
          .from("shopper_profiles")
          .insert({
            user_id: authData.user.id,
            name,
            marketing_consent: marketingConsent,
          });
        if (profileError) console.error("Error creating shopper profile:", profileError);

        toast({
          title: "Check your email",
          description: "We've sent a confirmation link to " + email + ". Please verify your email to sign in.",
        });
        handleOpenChange(false);
        return;
      }

      if (authData.user) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "shopper",
        });
        if (roleError) console.error("Error assigning role:", roleError);

        const { error: profileError } = await supabase
          .from("shopper_profiles")
          .insert({
            user_id: authData.user.id,
            name,
            marketing_consent: marketingConsent,
          });
        if (profileError) console.error("Error creating shopper profile:", profileError);
      }

      toast({
        title: "Account created!",
        description: "Welcome to MyStorefront.",
      });

      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      let message = error.message;
      if (message.includes("User already registered")) {
        message = "An account with this email already exists. Try signing in instead.";
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signinSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({ title: "Welcome back!" });
      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      let message = error.message;
      if (message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {mode === "choice" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Save your favourites</DialogTitle>
              <DialogDescription className="text-base">
                Create an account to wishlist items and follow creators.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-4">
              <Button
                className="w-full h-12"
                onClick={() => setMode("signup")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setMode("signin")}
              >
                Sign in
              </Button>
            </div>
          </>
        )}

        {mode === "signup" && (
          <>
            <DialogHeader>
              <DialogTitle>Create your account</DialogTitle>
              <DialogDescription>
                Join to save products and follow your favorite creators.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSignup} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="marketing-consent"
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(!!checked)}
                />
                <Label
                  htmlFor="marketing-consent"
                  className="text-sm font-normal leading-tight cursor-pointer"
                >
                  Send me updates about my wishlist and new finds.
                </Label>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrors({});
                }}
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </button>
            </div>
          </>
        )}

        {mode === "signin" && (
          <>
            <DialogHeader>
              <DialogTitle>Welcome back</DialogTitle>
              <DialogDescription>
                Sign in to access your wishlist and followed creators.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSignin} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrors({});
                }}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
