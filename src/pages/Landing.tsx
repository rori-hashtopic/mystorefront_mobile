import { useState, useRef, useEffect } from "react";
import { Instagram, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import "./Landing.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Hero images
import heroSlide0 from "@/assets/hero-slide-0.png";
import heroSlide1 from "@/assets/hero-slide-1.png";
import heroSlide2 from "@/assets/hero-slide-2.png";
import storefrontLogo from "@/assets/storefront-logo.png";
import CreatorWaitlistForm from "@/components/landing/CreatorWaitlistForm";
import BrandWaitlistForm from "@/components/landing/BrandWaitlistForm";

// Creator step screenshots
import creatorStep1 from "@/assets/creator-storefront-product-curation.png";
import creatorStep2 from "@/assets/messages-brand-partnership-brief.png";
import creatorStep3 from "@/assets/creator-analytics-create-share.png";
import creatorStep4 from "@/assets/creator-earnings-dashboard.png";

// Brand step screenshots
import brandStep1 from "@/assets/shopify-postback-plugin.png";
import brandStep2 from "@/assets/creator-directory.png";
import brandStep3 from "@/assets/creator-analytics-dashboard.png";
import brandStep4 from "@/assets/payments-dashboard.png";

const creatorSteps = [
  {
    title: "Build Your Storefront",
    desc: "Build your storefront in minutes - choose your niche, link your social accounts, and curate your favourite products.",
    img: creatorStep1,
    alt: "Creator Storefront - Product Curation",
  },
  {
    title: "Connect & Collaborate",
    desc: "Drive traffic to your storefront and grow your audience. Request and receive gifting, collabs, or exclusive discount codes for your audience.",
    img: creatorStep2,
    alt: "Messages - Brand Partnership Brief",
  },
  {
    title: "Create & Share",
    desc: "Share your storefront or product links across any channel - Instagram, TikTok, YouTube. Every visit is tracked, every sale attributed back to you.",
    img: creatorStep3,
    alt: "Creator Analytics - Create & Share",
  },
  {
    title: "Get Paid",
    desc: "Request payouts on your schedule. As your results grow, so does your leverage with brands.",
    img: creatorStep4,
    alt: "Creator Earnings Dashboard",
  },
];

const brandSteps = [
  {
    title: "Set Up & Go Live",
    desc: "Connect your website in minutes by installing our plugin on Shopify, WordPress, or custom-built websites, define your commission structure, and set your collaboration preferences.",
    img: brandStep1,
    alt: "Postback Plugin Setup",
  },
  {
    title: "Discover Creators",
    desc: "Browse creator profiles and identify rising creators aligned with your audience. Directly message creators, initiate partnerships, and send promotional briefs - all within the platform.",
    img: brandStep2,
    alt: "Creator Directory",
  },
  {
    title: "Track Performance",
    desc: "See which creators convert, which content resonates, and where to invest more. Full strategy, no guesswork.",
    img: brandStep3,
    alt: "Creator Analytics Dashboard",
  },
  {
    title: "Pay on Results",
    desc: "Commission-based models mean you only pay when sales happen. No wasted spend.",
    img: brandStep4,
    alt: "Payments Dashboard",
  },
];

/* Reusable scroll-triggered wrapper */
const RevealSection = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
};

/* Step row with staggered text + image */
const StepRow = ({
  step,
  index,
}: {
  step: { title: string; desc: string; img: string | null; alt: string };
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="step-row">
      <motion.div
        className="step-row-text"
        initial={{ opacity: 0, x: -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <motion.span
          className="step-number"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={isInView ? { opacity: 0.45, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          {String(index + 1).padStart(2, "0")}
        </motion.span>
        <div className="step-text-content">
          <motion.div
            className="step-title"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            {step.title}
          </motion.div>
          <motion.p
            className="step-desc"
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
          >
            {step.desc}
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        className="step-row-img"
        initial={{ opacity: 0, scale: 1.06, filter: "grayscale(0.4)" }}
        animate={isInView ? { opacity: 1, scale: 1, filter: "grayscale(0)" } : {}}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        {step.img ? (
          <img src={step.img} alt={step.alt} className="step-screenshot" />
        ) : (
          <div className="step-row-placeholder">
            <span className="placeholder-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="placeholder-title">{step.title}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* Audience panel with scroll reveal */
const AudiencePanel = ({
  id,
  variant,
  tag,
  headline,
  desc,
  cta,
  onCtaClick,
  delay = 0,
}: {
  id: string;
  variant: "creators" | "brands";
  tag: string;
  headline: React.ReactNode;
  desc: string;
  cta: string;
  onCtaClick: () => void;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={`audience-panel ${variant}`}
      id={id}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <motion.span
        className="panel-tag"
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.15 }}
      >
        {tag}
      </motion.span>
      <motion.h2
        className="panel-headline"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut", delay: delay + 0.25 }}
      >
        {headline}
      </motion.h2>
      <motion.div
        className="panel-rule"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.4 }}
        style={{ transformOrigin: "left" }}
      />
      <motion.p
        className="panel-desc"
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: delay + 0.45 }}
      >
        {desc}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.6 }}
      >
        <button onClick={onCtaClick} className="btn-panel">
          {cta}
        </button>
      </motion.div>
    </motion.div>
  );
};

/* Brand pitch deck email form */
const BrandPitchDeckForm = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUrl = websiteUrl.trim();
    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!trimmedUrl) {
      toast.error("Please enter your website URL.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("brand_waitlist").insert({
      brand_name: "Pitch Deck / Demo Request",
      full_name: trimmedName,
      email: trimmedEmail,
      website_url: trimmedUrl,
      goals: "Pitch deck / demo request",
    } as any);
    setLoading(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
    // Fire-and-forget notification (content is read server-side from the row)
    supabase.functions
      .invoke("send-waitlist-notification", {
        body: { type: "brand", email: trimmedEmail.toLowerCase() },
      })
      .catch(() => {});
  };

  if (submitted) {
    return (
      <motion.div
        className="flex flex-col items-center gap-4 py-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CheckCircle2 size={40} strokeWidth={1.5} style={{ color: "var(--ink)" }} />
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--ink)" }}>
          We'll be in touch shortly with the pitch deck and demo details.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="brand-pitch-form">
      <div className="brand-pitch-fields">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="wf-input"
          style={{ margin: 0 }}
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          maxLength={255}
          className="wf-input"
          style={{ margin: 0 }}
          required
        />
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://brandurl.co.za"
          maxLength={255}
          className="wf-input"
          style={{ margin: 0 }}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-panel whitespace-nowrap"
        style={{ minWidth: "fit-content" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Me the Deck & Demo"}
      </button>
    </form>
  );
};

const Landing = () => {
  const [activeTab, setActiveTab] = useState<"creators" | "brands">("creators");
  const [searchParams, setSearchParams] = useSearchParams();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [brandWaitlistOpen, setBrandWaitlistOpen] = useState(false);

  // Auto-open modal from URL param: ?waitlist=creator or ?waitlist=brand
  useEffect(() => {
    const w = searchParams.get("waitlist");
    if (w === "creator") setWaitlistOpen(true);
    else if (w === "brand") setBrandWaitlistOpen(true);
  }, []);

  // Sync URL when modals close
  const handleCreatorModalChange = (open: boolean) => {
    setWaitlistOpen(open);
    if (!open && searchParams.get("waitlist") === "creator") {
      setSearchParams({}, { replace: true });
    }
  };
  const handleBrandModalChange = (open: boolean) => {
    setBrandWaitlistOpen(open);
    if (!open && searchParams.get("waitlist") === "brand") {
      setSearchParams({}, { replace: true });
    }
  };

  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  const heroSlides = [heroSlide0, heroSlide1, heroSlide2];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/landing" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={storefrontLogo} alt="MyStorefront icon" style={{ height: "24px", width: "24px" }} />
          MyStorefront
        </Link>

        {/* Mobile sign-in button */}
        <a href="/auth" className="nav-cta nav-cta-mobile">
          Sign In
        </a>

        {/* Desktop nav links */}
        <ul className="nav-links">
          <li>
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("creators");
                document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              For Creators
            </a>
          </li>
          <li>
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("brands");
                document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              For Brands
            </a>
          </li>
          <li>
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              How It Works
            </a>
          </li>
          <li>
            <a href="/auth" className="nav-cta">
              Sign In
            </a>
          </li>
        </ul>
      </motion.nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <motion.p
            className="hero-eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Creator Affiliate Platform
          </motion.p>
          <motion.h1
            className="hero-headline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          >
            Your content.
            <br />
            Your audience.
            <br />
            <em>Your income.</em>
          </motion.h1>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            MyStorefront connects South African brands with South African creators who drive product sales through
            trusted recommendations and curated storefronts.
          </motion.p>
          <motion.div
            className="hero-ctas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
          >
            <button onClick={() => setWaitlistOpen(true)} className="landing-btn-primary">
              Join the Waitlist
            </button>
            <div className="brand-waitlist-wrapper">
              <button onClick={() => setBrandWaitlistOpen(true)} className="btn-panel">
                {"Brand Waitlist →"}
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="hero-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        >
          <AnimatePresence mode="popLayout">
            <motion.img
              key={heroSlideIndex}
              src={heroSlides[heroSlideIndex]}
              alt={`Creator content showcase ${heroSlideIndex + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AnimatePresence>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how">
        <RevealSection>
          <p className="how-eyebrow">The Process</p>
          <h2 className="how-headline">How It Works</h2>
        </RevealSection>

        <RevealSection delay={0.1}>
          <div className="steps-toggle-bar">
            <button
              className={`steps-toggle-btn ${activeTab === "creators" ? "active" : ""}`}
              onClick={() => setActiveTab("creators")}
            >
              Creators
            </button>
            <button
              className={`steps-toggle-btn ${activeTab === "brands" ? "active" : ""}`}
              onClick={() => setActiveTab("brands")}
            >
              Brands
            </button>
          </div>
        </RevealSection>

        <RevealSection delay={0.2}>
          <AnimatePresence mode="wait">
            <motion.div
              className="steps-panel"
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* COPY AT THE TOP */}
              {activeTab === "creators" ? (
                <>
                  <div className="process-intro">
                    <span className="panel-tag">For Creators</span>
                    <h2 className="panel-headline">
                      Turn your recommendations
                      <br />
                      into <em>real revenue</em>
                    </h2>
                    <p className="panel-desc">
                      Build your own digital storefront featuring the products you love and earn commission every time
                      your audience shops through you.
                    </p>
                  </div>

                  {/* Creator steps */}
                  <div className="steps-alt">
                    {creatorSteps.map((step, i) => (
                      <StepRow key={step.title} step={step} index={i} />
                    ))}
                  </div>

                  <div className="process-cta">
                    <button onClick={() => setWaitlistOpen(true)} className="btn-panel">
                      Join the Creator Waitlist →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="process-intro">
                    <span className="panel-tag">For Brands</span>
                    <h2 className="panel-headline">
                      Creator marketing that's
                      <br />
                      <em>measurable</em>, not guesswork
                    </h2>
                    <p className="panel-desc">
                      Reach your ideal audience through trusted creators. Track every click, every sale, every rand -
                      with full transparency from setup to payout.
                    </p>
                  </div>

                  {/* Brand steps */}
                  <div className="steps-alt">
                    {brandSteps.map((step, i) => (
                      <StepRow key={step.title} step={step} index={i} />
                    ))}
                  </div>

                  <div className="brand-pitch-card">
                    <span className="panel-tag brand-pitch-tag">Want the full pitch or to see the demo?</span>
                    <h3 className="brand-pitch-title font-serif">Get the Deck &amp; Guided Demo</h3>
                    <p className="brand-pitch-desc">
                      Drop your details and we'll send our brand pitch deck along with demo access
                    </p>
                    <BrandPitchDeckForm />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </RevealSection>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span className="footer-logo">MyStorefront</span>
          <p className="footer-tagline">Creator Affiliate Platform</p>
          <div className="footer-socials">
            <a
              href="https://www.instagram.com/mystorefront.io/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram className="h-7 w-7" />
            </a>
            <a
              href="https://www.tiktok.com/@mystorefrontza"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
              </svg>
            </a>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">&copy; {new Date().getFullYear()} MyStorefront. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* CREATOR WAITLIST MODAL */}
      <Dialog open={waitlistOpen} onOpenChange={handleCreatorModalChange}>
        <DialogContent className="waitlist-modal max-w-[90%] sm:max-w-[600px] max-h-[90vh] overflow-hidden border-[var(--rule)] bg-[#f2efe9] p-0 rounded-2xl">
          <div className="waitlist-scroll">
            <CreatorWaitlistForm />
          </div>
        </DialogContent>
      </Dialog>

      {/* BRAND WAITLIST MODAL */}
      <Dialog open={brandWaitlistOpen} onOpenChange={handleBrandModalChange}>
        <DialogContent className="waitlist-modal max-w-[90%] sm:max-w-[600px] max-h-[90vh] overflow-hidden border-[var(--rule)] bg-[#f2efe9] p-0 rounded-2xl">
          <div className="waitlist-scroll">
            <BrandWaitlistForm />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
