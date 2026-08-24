import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";

/**
 * The access code is never shipped to the browser. The code the user types is
 * verified server-side by the brand-onboarding-create edge function, and the
 * validated value is handed to the form so it can be replayed on submit.
 */
export default function OnboardingAccessGate({
  children,
}: {
  children: (accessCode: string) => React.ReactNode;
}) {
  const [unlockedCode, setUnlockedCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the access code.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("brand-onboarding-create", {
        body: { validate_only: true, access_code: trimmed },
      });
      if (fnError || !(data as { valid?: boolean } | null)?.valid) {
        setError("Incorrect access code.");
        return;
      }
      setUnlockedCode(trimmed);
    } catch {
      setError("Could not verify the access code. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  if (unlockedCode) return <>{children(unlockedCode)}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="MyStorefront" className="h-8" />
        </div>
        <h1 className="font-serif text-2xl text-center mb-2">Restricted access</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Enter the access code to continue to brand onboarding.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Access code</Label>
            <Input
              id="access-code"
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={checking}>
            {checking ? "Checking…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
