import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";

const STORE_PLATFORMS = ["Shopify", "WooCommerce", "Other", "No store yet"];

const BrandWaitlistForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    brand_name: "",
    website_url: "",
    full_name: "",
    email: "",
    store_platform: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.brand_name.trim() ||
      !form.website_url.trim() ||
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.store_platform
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("brand_waitlist" as any).insert({
      brand_name: form.brand_name.trim().slice(0, 150),
      website_url: form.website_url.trim().slice(0, 500),
      full_name: form.full_name.trim().slice(0, 100),
      email: form.email.trim().toLowerCase().slice(0, 255),
      store_platform: form.store_platform.slice(0, 50),
    } as any);

    setLoading(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);

    supabase.functions
      .invoke("send-waitlist-notification", {
        body: { type: "brand", email: form.email.trim().toLowerCase() },
      })
      .catch(() => {});
  };

  if (submitted) {
    return (
      <motion.div
        className="waitlist-success"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="waitlist-success-header">
          <CheckCircle2 className="waitlist-success-icon" size={40} strokeWidth={1.5} />
          <p className="waitlist-success-eyebrow">Application received</p>
          <DialogTitle asChild>
            <h3>You're on the list!</h3>
          </DialogTitle>
        </div>

        <div className="waitlist-success-body">
          <p>
            Our team will review your application and be in touch soon with next steps and early access details for
            selected brands.
          </p>
          <p>
            Questions in the meantime? Reach us at <a href="mailto:roxi@mystorefront.io">roxi@mystorefront.io</a>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <p className="wf-eyebrow-top">Brand application</p>

      <div className="wf-header">
        <DialogTitle asChild>
          <h2 className="wf-title">Apply to list your brand</h2>
        </DialogTitle>
        <p className="wf-subtitle">
          MyStorefront is a creator affiliate platform. Creators feature your products on their storefronts, share
          tracked affiliate links with their followers, and drive sales to your store.
        </p>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Brand Name<span className="wf-req">*</span>
          </span>
          <input className="wf-input" type="text" value={form.brand_name} onChange={set("brand_name")} />
        </label>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Website URL<span className="wf-req">*</span>
          </span>
          <input
            className="wf-input"
            type="text"
            placeholder="e.g. yourbrand.co.za"
            value={form.website_url}
            onChange={set("website_url")}
          />
        </label>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Your Full Name<span className="wf-req">*</span>
          </span>
          <input className="wf-input" type="text" value={form.full_name} onChange={set("full_name")} />
        </label>
        <label className="wf-label">
          <span>
            Email Address<span className="wf-req">*</span>
          </span>
          <input className="wf-input" type="email" value={form.email} onChange={set("email")} />
        </label>
      </div>

      <div className="wf-row">
        <label className="wf-label">
          <span>
            Store platform<span className="wf-req">*</span>
          </span>
          <select className="wf-input" value={form.store_platform} onChange={set("store_platform")}>
            <option value="">Select</option>
            {STORE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button className="wf-submit" type="submit" disabled={loading}>
        {loading ? "Submitting…" : "Sign up to waitlist"}
      </button>
    </form>
  );
};

export default BrandWaitlistForm;
