import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Blog", "Other"];
const NICHES = ["Fashion", "Beauty", "Home", "Fitness", "Food", "Tech", "Lifestyle", "Other"];
const FOLLOWER_RANGES = ["<1K", "1–5K", "5–10K", "10–25K", "25–50K", "50–100K", "100–250K", "250K+"];
const REFERRAL_SOURCES = [
  "Social media",
  "Friend / referral",
  "Google search",
  "Blog / article",
  "Podcast",
  "Event",
  "Other",
];

const CreatorWaitlistForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    primary_platform: "",
    social_handle: "",
    niche: "",
    follower_range: "",
    biggest_challenge: "",
    referral_source: "",
    referral_source_other: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.social_handle.trim() ||
      !form.follower_range ||
      !form.referral_source
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (form.referral_source === "Other" && !form.referral_source_other.trim()) {
      toast.error("Please tell us how you heard about us.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const finalReferralSource =
      form.referral_source === "Other" ? `Other: ${form.referral_source_other.trim()}` : form.referral_source;

    setLoading(true);
    const { error } = await supabase.from("creator_waitlist" as any).insert({
      full_name: form.full_name.trim().slice(0, 100),
      email: form.email.trim().toLowerCase().slice(0, 255),
      primary_platform: form.primary_platform,
      social_handle: form.social_handle.trim().slice(0, 200),
      niche: form.niche,
      follower_range: form.follower_range,
      biggest_challenge: form.biggest_challenge.trim().slice(0, 1000) || null,
      referral_source: finalReferralSource,
    } as any);
    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This Instagram handle has already been submitted.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    // Fire-and-forget notification (content is read server-side from the row)
    supabase.functions.invoke("send-waitlist-notification", {
      body: { type: "creator", email: form.email.trim().toLowerCase() },
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        className="waitlist-success"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CheckCircle2 size={48} strokeWidth={1.5} />
        <DialogTitle asChild>
          <h3>You're on the list!</h3>
        </DialogTitle>
        <p>
          We'll be reaching out to selected applicants with early access details via email. Be sure to follow us on
          Instagram for updates and announcements about the launch.
        </p>
        <a
          href="https://www.instagram.com/mystorefront.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="wf-instagram-link"
        >
          <InstagramIcon />
          Follow us on Instagram
        </a>
      </motion.div>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <div className="wf-header">
        <DialogTitle asChild>
          <h2 className="wf-title">Join the Creator Waitlist</h2>
        </DialogTitle>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Full Name<span className="wf-req">*</span>
          </span>
          <input
            className="wf-input"
            type="text"
            value={form.full_name}
            onChange={set("full_name")}
            placeholder="Jane Doe"
            maxLength={100}
          />
        </label>
        <label className="wf-label">
          <span>
            Email<span className="wf-req">*</span>
          </span>
          <input
            className="wf-input"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="jane@example.com"
            maxLength={255}
          />
        </label>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Instagram Handle<span className="wf-req">*</span>
          </span>
          <div className="wf-input-prefix">
            <span className="wf-prefix">@</span>
            <input
              className="wf-input wf-input-with-prefix"
              type="text"
              value={form.social_handle}
              onChange={set("social_handle")}
              placeholder="janedoe"
              maxLength={200}
            />
          </div>
        </label>
        <label className="wf-label">
          <span>
            Follower Count<span className="wf-req">*</span>
          </span>
          <select className="wf-select" value={form.follower_range} onChange={set("follower_range")}>
            <option value="">Select…</option>
            {FOLLOWER_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="wf-label wf-full">
        <span>What's stopping you from monetising your content?</span>
        <textarea
          className="wf-textarea"
          value={form.biggest_challenge}
          onChange={set("biggest_challenge")}
          rows={2}
          maxLength={1000}
          placeholder="e.g. I don't have enough followers yet, Affiliate links are confusing to set up, I only get offered free products, not paid deals."
        />
      </label>

      <label className="wf-label wf-full">
        <span>
          How did you hear about us?<span className="wf-req">*</span>
        </span>
        <select className="wf-select" value={form.referral_source} onChange={set("referral_source")}>
          <option value="">Select…</option>
          {REFERRAL_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {form.referral_source === "Other" && (
        <label className="wf-label wf-full">
          <span>
            Please specify<span className="wf-req">*</span>
          </span>
          <input
            className="wf-input"
            type="text"
            value={form.referral_source_other}
            onChange={set("referral_source_other")}
            placeholder="Tell us how you found us"
            maxLength={200}
          />
        </label>
      )}

      <button className="wf-submit" type="submit" disabled={loading}>
        {loading ? "Submitting…" : "Join the Waitlist"}
      </button>
    </form>
  );
};

export default CreatorWaitlistForm;
