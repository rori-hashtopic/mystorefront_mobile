import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Instagram, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import logo from "@/assets/logo.svg";

type Step = 1 | 2;
type ApplicationStatus = "pending" | "approved" | "declined" | "more_info_needed";

type ExistingApplication = {
  id: string;
  status: ApplicationStatus;
  submitted_at: string;
  reviewed_at: string | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  instagramHandle: string;
  tiktokHandle: string;
  youtubeHandle: string;
  otherLink: string;
  primaryPlatform: string;
  followerRange: string;
};

const primaryPlatforms = ["Instagram", "TikTok", "YouTube", "Other"];
const followerRanges = [
  "Under 1,000",
  "1,000 – 5,000",
  "5,000 – 10,000",
  "10,000 – 50,000",
  "50,000 – 250,000",
  "250,000+",
];

const urlSchema = z.string().url();

// Strip everything but digits and remove SA prefixes (0, 27, 0027) to get the 9-digit national number.
function normalizeSAWhatsApp(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("0027")) digits = digits.slice(4);
  else if (digits.startsWith("27")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

// Format a 9-digit national number as "82 000 0000".
function formatSAWhatsApp(raw: string): string {
  const digits = normalizeSAWhatsApp(raw);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

function validateSAWhatsApp(raw: string): string | null {
  const digits = normalizeSAWhatsApp(raw);
  if (digits.length === 0) return null; // optional field
  if (digits.length !== 9) return "Enter a 9-digit SA mobile number (e.g. 82 000 0000).";
  if (!/^[678]\d{8}$/.test(digits)) return "Enter a valid SA mobile number starting with 6, 7, or 8.";
  return null;
}

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="MyStorefront home">
            <img src={logo} alt="MyStorefront" className="h-5 w-auto" />
            <span className="font-display text-xl tracking-tight text-foreground">MyStorefront</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 sm:px-8">{children}</div>
    </main>
  );
}

function SubmittedScreen() {
  return (
    <Shell>
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-16 text-center sm:py-20">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Creator application</p>
        <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">Application received</h1>
        <div className="mx-auto mt-6 max-w-xl space-y-4 text-base leading-8 text-muted-foreground">
          <p>
            We have received your application and will contact you soon. If approved, you'll receive an email with a
            link to set up your creator account.
          </p>
          <p>In the meantime, follow us on Instagram for updates and to see what other creators are sharing.</p>
        </div>
        <Button asChild className="mx-auto mt-10 w-fit gap-2">
          <a
            href="https://instagram.com/mystorefront.io"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow MyStorefront on Instagram"
          >
            <Instagram className="h-4 w-4" /> Follow us on Instagram
          </a>
        </Button>
      </div>
    </Shell>
  );
}

export function BecomeCreatorSubmitted() {
  return <SubmittedScreen />;
}

export default function BecomeCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [step, setStep] = useState<Step>(1);
  const [loadingApplication, setLoadingApplication] = useState(true);
  const [existingApplication, setExistingApplication] = useState<ExistingApplication | null>(null);
  const [reapplyDate, setReapplyDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    whatsappNumber: "",
    instagramHandle: "",
    tiktokHandle: "",
    youtubeHandle: "",
    otherLink: "",
    primaryPlatform: "",
    followerRange: "",
  });

  const db = supabase as any;
  const referralCode = useMemo(() => searchParams.get("ref")?.trim() || "", [searchParams]);

  useEffect(() => {
    if (user?.email) {
      setForm((current) => ({ ...current, email: current.email || user.email || "" }));
    }
  }, [user?.email]);

  useEffect(() => {
    if (!roleLoading && role === "creator") {
      toast({ title: "You're already a creator!" });
      navigate("/shop", { replace: true });
    }
  }, [navigate, role, roleLoading, toast]);

  useEffect(() => {
    if (step === 2) {
      setHasAttemptedSubmit(false);
      setErrors((current) => ({
        ...current,
        instagramHandle: "",
        primaryPlatform: "",
        followerRange: "",
        otherLink: "",
      }));
    }
  }, [step]);

  useEffect(() => {
    async function fetchExistingApplication() {
      if (authLoading || !user) {
        setLoadingApplication(false);
        return;
      }

      setLoadingApplication(true);
      const { data, error } = await db
        .from("creator_applications")
        .select("id,status,submitted_at,reviewed_at")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading creator application", error);
        toast({ title: "Could not load your application status", variant: "destructive" });
      } else {
        setExistingApplication(data as ExistingApplication | null);
      }
      setLoadingApplication(false);
    }

    fetchExistingApplication();
  }, [authLoading, db, toast, user]);

  const firstStepComplete = useMemo(
    () => Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim()),
    [form.email, form.firstName, form.lastName],
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const goNext = () => {
    if (!firstStepComplete) return;
    setErrors({});
    setHasAttemptedSubmit(false);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateSubmission = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.instagramHandle.trim()) nextErrors.instagramHandle = "Instagram is required.";
    if (!form.primaryPlatform) nextErrors.primaryPlatform = "Choose your primary platform.";
    if (!form.followerRange) nextErrors.followerRange = "Choose your follower count range.";
    if (form.otherLink.trim() && !urlSchema.safeParse(form.otherLink.trim()).success) {
      nextErrors.otherLink = "Enter a valid URL, including https://";
    }
    const whatsappError = validateSAWhatsApp(form.whatsappNumber);
    if (whatsappError) nextErrors.whatsappNumber = whatsappError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (!validateSubmission()) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creator-application-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          whatsappNumber: form.whatsappNumber.trim() ? `+27${normalizeSAWhatsApp(form.whatsappNumber)}` : "",
          referralCode: referralCode || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.status === "duplicate_pending" || result.status === "already_approved") {
          setExistingApplication(result.application);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (result.status === "reapply_later") {
          setExistingApplication(result.application);
          setReapplyDate(result.reapplyDate);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        throw new Error(result.error || "Please try again.");
      }

      if (result.status === "already_creator") {
        toast({ title: "You're already a creator!" });
        navigate("/shop", { replace: true });
        return;
      }

      navigate("/become-a-creator/submitted", { replace: true, state: { firstName: form.firstName.trim() } });
    } catch (error: any) {
      toast({
        title: "Application not submitted",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || roleLoading || loadingApplication) {
    return (
      <Shell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (existingApplication?.status === "pending" || existingApplication?.status === "more_info_needed") {
    return (
      <Shell>
        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-16">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Submitted {formatDate(existingApplication.submitted_at)}
          </p>
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">You've already applied</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            We have received your application and will contact you soon. If approved, you'll receive an email with a
            link to set up your creator account.
          </p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            In the meantime, follow us on Instagram{" "}
            <a
              href="https://instagram.com/mystorefront.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              [@mystorefront.io]
            </a>{" "}
            for updates and to see what other creators are sharing.
          </p>
          <Button asChild className="mt-10 w-fit">
            <Link to="/">Back to MyStorefront →</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (existingApplication?.status === "declined") {
    const nextReapplyDate = reapplyDate
      ? new Date(reapplyDate)
      : addDays(existingApplication.reviewed_at || existingApplication.submitted_at, 30);
    if (nextReapplyDate > new Date()) {
      return (
        <Shell>
          <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-16">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Creator application</p>
            <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
              You can reapply on {formatDate(nextReapplyDate)}
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Thanks for your interest in MyStorefront. You can submit a new application after the review window has
              passed.
            </p>
            <Button asChild className="mt-10 w-fit">
              <Link to="/">Back to MyStorefront →</Link>
            </Button>
          </div>
        </Shell>
      );
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl py-12 sm:py-16">
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>Step {step} of 2</span>
            <span>{step === 1 ? "About you" : "Your content"}</span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1 rounded-none bg-border" />
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <section className="animate-fade-in">
              <div className="mb-10">
                <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
                  Become a MyStorefront Creator
                </h1>
                <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
                  Build your own digital storefront featuring the products you love and earn commission when your
                  audience shops through you.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="First name" error={errors.firstName} required>
                  <Input
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Last name" error={errors.lastName} required>
                  <Input
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Email" error={errors.email} className="sm:col-span-2" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                  />
                </Field>
                <Field label="WhatsApp number" error={errors.whatsappNumber} className="sm:col-span-2">
                  <div
                    className={`flex rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring/20 ${
                      errors.whatsappNumber
                        ? "border-destructive focus-within:border-destructive"
                        : "border-border focus-within:border-foreground"
                    }`}
                  >
                    <span className="flex items-center border-r border-border px-4 text-sm text-muted-foreground">
                      🇿🇦 +27
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={form.whatsappNumber}
                      onChange={(event) => updateField("whatsappNumber", formatSAWhatsApp(event.target.value))}
                      onBlur={() => {
                        const err = validateSAWhatsApp(form.whatsappNumber);
                        setErrors((current) => ({ ...current, whatsappNumber: err || "" }));
                      }}
                      onKeyDown={(event) => {
                        // Allow control keys; block any non-digit character entry
                        const allowed = [
                          "Backspace",
                          "Delete",
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                          "Tab",
                          "Home",
                          "End",
                          "Enter",
                        ];
                        if (event.ctrlKey || event.metaKey || allowed.includes(event.key)) return;
                        if (!/^\d$/.test(event.key)) event.preventDefault();
                      }}
                      onPaste={(event) => {
                        event.preventDefault();
                        const text = event.clipboardData.getData("text");
                        updateField("whatsappNumber", formatSAWhatsApp(text));
                      }}
                      maxLength={12}
                      className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="82 000 0000"
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="button" onClick={goNext} disabled={!firstStepComplete}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          ) : (
            <section className="animate-fade-in">
              <div className="mb-10">
                <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
                  Where do you create?
                </h1>
              </div>

              <div className="space-y-6">
                <PrefixedField label="Instagram" prefix="instagram.com/" required>
                  <input
                    value={form.instagramHandle}
                    onChange={(event) => updateField("instagramHandle", event.target.value)}
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </PrefixedField>
                <PrefixedField label="TikTok" prefix="tiktok.com/@">
                  <input
                    value={form.tiktokHandle}
                    onChange={(event) => updateField("tiktokHandle", event.target.value)}
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </PrefixedField>
                <PrefixedField label="YouTube" prefix="youtube.com/@">
                  <input
                    value={form.youtubeHandle}
                    onChange={(event) => updateField("youtubeHandle", event.target.value)}
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </PrefixedField>
                <Field label="Other link" error={hasAttemptedSubmit ? errors.otherLink : undefined}>
                  <Input
                    type="url"
                    value={form.otherLink}
                    onChange={(event) => updateField("otherLink", event.target.value)}
                    placeholder="https://"
                  />
                </Field>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Primary platform" required>
                    <Select
                      value={form.primaryPlatform}
                      onValueChange={(value) => updateField("primaryPlatform", value)}
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {primaryPlatforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Follower count range" required>
                    <Select value={form.followerRange} onValueChange={(value) => updateField("followerRange", value)}>
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {followerRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <p className="border-l border-border pl-4 text-xs italic leading-6 text-muted-foreground">
                  Note: We verify all applications against your live profile before approving.
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setHasAttemptedSubmit(false);
                    setErrors({});
                    setStep(1);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit Application <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}
        </form>
      </div>
    </Shell>
  );
}

function Field({
  label,
  error,
  className,
  required,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted-foreground">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PrefixedField({
  label,
  prefix,
  error,
  required,
  children,
}: {
  label: string;
  prefix: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted-foreground">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <div className="flex min-w-0 rounded-xl border border-border bg-background focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring/20">
        <span className="flex shrink-0 items-center border-r border-border px-3 text-xs text-muted-foreground sm:text-sm">
          {prefix}
        </span>
        {children}
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
