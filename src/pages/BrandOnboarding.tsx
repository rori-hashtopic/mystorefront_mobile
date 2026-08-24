import { FormEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.svg";
import OnboardingAccessGate from "@/components/onboarding/OnboardingAccessGate";

const CATEGORIES = [
  "Fashion & Apparel",
  "Beauty & Wellness",
  "Home & Lifestyle",
  "Electronics",
  "Food & Beverage",
  "Sports & Outdoor",
  "Other",
] as const;

type FormState = {
  brandName: string;
  email: string;
  password: string;
  logoFile: File | null;
  logoPreview: string | null;
  websiteUrl: string;
  category: string;
  categoryOther: string;
  commissionPercent: string;
  refundBufferDays: string;
  tosAccepted: boolean;
};

const initialState: FormState = {
  brandName: "",
  email: "",
  password: "",
  logoFile: null,
  logoPreview: null,
  websiteUrl: "",
  category: "",
  categoryOther: "",
  commissionPercent: "10",
  refundBufferDays: "30",
  tosAccepted: false,
};

const step1Schema = z.object({
  brandName: z.string().trim().min(2, "Brand name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  logoFile: z.instanceof(File, { message: "Upload a logo" }),
});

const step2Schema = z
  .object({
    websiteUrl: z.string().trim().url("Enter a valid URL").max(255),
    category: z.string().min(1, "Select a category"),
    categoryOther: z.string().trim().max(60).optional(),
    commissionPercent: z.coerce.number().min(0, "Must be ≥ 0").max(100, "Must be ≤ 100"),
    refundBufferDays: z.coerce.number().int().min(0, "Must be ≥ 0").max(365, "Must be ≤ 365"),
  })
  .superRefine((data, ctx) => {
    if (data.category === "Other" && (!data.categoryOther || data.categoryOther.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "Specify your category",
      });
    }
  });

type Errors = Partial<Record<keyof FormState, string>>;

const stepLabels = ["Brand identity", "Platform setup", "Review & confirm"];

export default function BrandOnboarding() {
  return (
    <OnboardingAccessGate>
      {(accessCode) => <BrandOnboardingForm accessCode={accessCode} />}
    </OnboardingAccessGate>
  );
}

function BrandOnboardingForm({ accessCode }: { accessCode: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const resolvedCategory = useMemo(
    () => (form.category === "Other" ? form.categoryOther.trim() : form.category),
    [form.category, form.categoryOther],
  );

  const handleLogoChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, logoFile: "Logo must be an image" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, logoFile: "Logo must be under 5MB" }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, logoFile: file, logoPreview: preview }));
    setErrors((prev) => ({ ...prev, logoFile: undefined }));
  };

  const validateStep1 = () => {
    const result = step1Schema.safeParse({
      brandName: form.brandName,
      email: form.email,
      password: form.password,
      logoFile: form.logoFile,
    });
    if (result.success) return true;
    const next: Errors = {};
    result.error.issues.forEach((i) => {
      next[i.path[0] as keyof FormState] = i.message;
    });
    setErrors(next);
    return false;
  };

  const validateStep2 = () => {
    const result = step2Schema.safeParse({
      websiteUrl: form.websiteUrl,
      category: form.category,
      categoryOther: form.categoryOther,
      commissionPercent: form.commissionPercent,
      refundBufferDays: form.refundBufferDays,
    });
    if (result.success) return true;
    const next: Errors = {};
    result.error.issues.forEach((i) => {
      next[i.path[0] as keyof FormState] = i.message;
    });
    setErrors(next);
    return false;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const back = () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.tosAccepted) {
      setErrors((p) => ({ ...p, tosAccepted: "Please accept the Terms of Service to continue." }));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create user (email pre-confirmed -> no confirmation email) + brand account server-side.
      const { data: createData, error: createError } = await supabase.functions.invoke("brand-onboarding-create", {
        body: {
          email: form.email.trim(),
          password: form.password,
          brand_name: form.brandName.trim(),
          website_url: form.websiteUrl.trim(),
          category: resolvedCategory,
          commission_percent: Number(form.commissionPercent),
          refund_buffer_days: Number(form.refundBufferDays),
          access_code: accessCode,
        },
      });
      if (createError) throw createError;
      const userId = (createData as { user_id?: string })?.user_id;
      const brandId = (createData as { brand_id?: string })?.brand_id;
      if (!userId) throw new Error("Account could not be created");

      // 2. Sign in so the new user has a session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (signInError) throw signInError;

      // 3. Upload logo (now authed) and patch the brand account.
      // Storage RLS requires the path to start with the brand_id folder.
      if (form.logoFile && brandId) {
        const ext = form.logoFile.name.split(".").pop() || "png";
        const path = `${brandId}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("brand-logos")
          .upload(path, form.logoFile, { upsert: true, contentType: form.logoFile.type });
        if (!uploadError) {
          const { data: pub } = supabase.storage.from("brand-logos").getPublicUrl(path);
          await supabase
            .from("brand_accounts")
            .update({ logo_url: pub.publicUrl, logo_upload_url: pub.publicUrl })
            .eq("id", brandId);
        } else {
          console.error("Logo upload failed", uploadError);
        }
      }

      toast({ title: "Welcome aboard", description: "Your brand is live." });
      navigate("/brand/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Could not create brand", description: message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <img src={logo} alt="MyStorefront" className="h-7 w-auto" />
          <button
            type="button"
            onClick={() => navigate("/landing")}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home →
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Brand onboarding</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Set up your brand
          </h1>
        </div>

        {/* Progress indicator */}
        <ol className="mb-12 flex items-center justify-between gap-2">
          {stepLabels.map((label, idx) => {
            const num = (idx + 1) as 1 | 2 | 3;
            const isComplete = step > num;
            const isActive = step === num;
            return (
              <li key={label} className="flex flex-1 items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center border text-sm font-medium transition-colors",
                    isComplete && "border-foreground bg-foreground text-background",
                    isActive && "border-foreground bg-background text-foreground",
                    !isComplete && !isActive && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : num}
                </div>
                <div className="hidden flex-1 sm:block">
                  <p
                    className={cn(
                      "text-xs uppercase tracking-[0.2em]",
                      isActive || isComplete ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </p>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={cn("hidden h-px flex-1 sm:block", isComplete ? "bg-foreground" : "bg-border")} />
                )}
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 1 && (
            <section className="space-y-6">
              <div className="space-y-3">
                <Label>Brand logo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-border bg-muted/40 overflow-hidden">
                    {form.logoPreview ? (
                      <img src={form.logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      {form.logoFile ? "Replace logo" : "Choose file"}
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG or SVG, max 5MB</p>
                  </div>
                </div>
                {errors.logoFile && <p className="text-xs text-destructive">{errors.logoFile}</p>}
              </div>

              <Field label="Brand name" error={errors.brandName}>
                <Input
                  value={form.brandName}
                  onChange={(e) => update("brandName", e.target.value)}
                  placeholder="Acme Co."
                />
              </Field>

              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@brand.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <Field label="Website URL" error={errors.websiteUrl}>
                <Input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                  placeholder="https://yourbrand.com"
                />
              </Field>

              <Field label="Category" error={errors.category}>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {form.category === "Other" && (
                <Field label="Specify category" error={errors.categoryOther}>
                  <Input
                    value={form.categoryOther}
                    onChange={(e) => update("categoryOther", e.target.value)}
                    placeholder="e.g. Pet care"
                  />
                </Field>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Commission (%)" error={errors.commissionPercent}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.commissionPercent}
                    onChange={(e) => update("commissionPercent", e.target.value)}
                  />
                </Field>
                <Field label="Refund buffer (days)" error={errors.refundBufferDays}>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    value={form.refundBufferDays}
                    onChange={(e) => update("refundBufferDays", e.target.value)}
                  />
                </Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div className="border border-border">
                <SummaryRow label="Logo">
                  {form.logoPreview ? (
                    <img src={form.logoPreview} alt="Logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </SummaryRow>
                <SummaryRow label="Brand name">{form.brandName}</SummaryRow>
                <SummaryRow label="Email">{form.email}</SummaryRow>
                <SummaryRow label="Website">{form.websiteUrl}</SummaryRow>
                <SummaryRow label="Category">{resolvedCategory}</SummaryRow>
                <SummaryRow label="Commission">{form.commissionPercent}%</SummaryRow>
                <SummaryRow label="Refund buffer">{form.refundBufferDays} days</SummaryRow>
              </div>
              <p className="text-xs text-muted-foreground">
                By confirming, your brand account will be created and activated immediately.
              </p>
              <div className="border-t border-border pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="brand-tos-accept"
                    checked={form.tosAccepted}
                    onCheckedChange={(v) => update("tosAccepted", v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="brand-tos-accept" className="text-sm font-normal leading-relaxed text-foreground">
                    I confirm that I am authorised to accept these terms on behalf of the Brand and agree to the
                    MyStorefront{" "}
                    <Link to="/terms" className="underline underline-offset-4 hover:text-foreground/80">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground/80">
                      Privacy Policy
                    </Link>
                    ,{" "}
                    <Link to="/cookie-notice" className="underline underline-offset-4 hover:text-foreground/80">
                      Cookie Notice
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/plugin-privacy-addendum"
                      className="underline underline-offset-4 hover:text-foreground/80"
                    >
                      Plugin Privacy Addendum
                    </Link>
                    .
                  </Label>
                </div>
                {errors.tosAccepted && <p className="mt-2 text-xs text-destructive">{errors.tosAccepted}</p>}
              </div>
            </section>
          )}

          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 1 || submitting} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={next} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    Confirm & launch <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="text-right text-sm text-foreground">{children}</div>
    </div>
  );
}
