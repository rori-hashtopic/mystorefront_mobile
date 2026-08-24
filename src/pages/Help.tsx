import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { useProfile } from "@/hooks/useProfile";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag, TrendingUp, Wallet, Users, Link2, Instagram, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const guides = [
  {
    id: "getting-started",
    icon: ShoppingBag,
    title: "Getting Started",
    description: "Set up your storefront and start sharing products",
    content: [
      "Complete your profile with a photo, bio, and display name",
      "Connect your Instagram or TikTok account in Settings",
      "Add products to your storefront using the + button on your Shop page",
      "Share your unique storefront link (mystorefront.co.za/yourusername) with your audience",
    ],
  },
  {
    id: "affiliate-links",
    icon: Link2,
    title: "How Affiliate Links Work",
    description: "Understanding tracking and attribution",
    content: [
      "When you add a product, we create a tracked affiliate link",
      "Each link contains your unique creator reference and a click ID",
      "When someone clicks your link and makes a purchase, the sale is attributed to you",
      "Clicks are tracked in real-time and visible on your Analytics page",
    ],
  },
  {
    id: "commissions",
    icon: TrendingUp,
    title: "Earning Commissions",
    description: "How you get paid for sales",
    content: [
      "Commission rates vary by brand (typically 5-15% of order value)",
      "Orders appear in your Earnings tab within 7 days of purchase",
      "New orders start as 'Pending' for a 30-day lock period",
      "After 30 days, earnings become 'Confirmed' and available for withdrawal",
    ],
  },
  {
    id: "payouts",
    icon: Wallet,
    title: "Requesting Payouts",
    description: "How to withdraw your earnings",
    content: [
      "Link a payout account (EFT bank account or PayFast) in the Earnings → Accounts section",
      "Minimum payout amount is R50",
      "Request a payout once your available balance reaches the minimum",
      "Payouts are processed manually and typically complete within 3-5 business days",
      "You'll receive a notification when your payout is sent",
    ],
  },
  {
    id: "tiers",
    icon: Users,
    title: "Creator Tiers",
    description: "Unlock features as you grow",
    content: [
      "Insider (default): Create affiliate links, track earnings, and use your custom storefront URL",
      "Featured: Unlock discount codes, brand gifting, guaranteed mentions, and direct messages from brands",
      "Tastemaker: Receive a top creator badge, priority collaboration consideration, and request access to brand opportunities",
      "Progress through tiers by completing profile, traction, referral, and activity milestones",
    ],
  },
  {
    id: "socials",
    icon: Instagram,
    title: "Connecting Social Accounts",
    description: "Link Instagram and TikTok for better analytics",
    content: [
      "Go to Settings → Social Accounts to connect your profiles",
      "Connecting socials helps brands discover you in the directory",
      "Your follower count, engagement rate, and content are synced automatically",
      "You can disconnect at any time from the Settings page",
    ],
  },
];

export default function Help() {
  const { profile } = useProfile();
  const tier = profile?.tier || "enthusiast";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar
        tier={tier}
        displayName={profile?.display_name}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-12 sm:space-y-16"
        >
          {/* Header */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Support</p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground">Help Center</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Everything you need to know about using MyStorefront as a creator.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3">
            {guides.map((guide) => (
              <a
                key={guide.id}
                href={`#${guide.id}`}
                className="text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors border border-border px-4 py-2"
              >
                {guide.title}
              </a>
            ))}
          </div>

          <div className="h-px bg-border" />

          {/* Guides */}
          <div className="space-y-16">
            {guides.map((guide, index) => (
              <motion.section
                key={guide.id}
                id={guide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="scroll-mt-24"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <guide.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl text-foreground">{guide.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{guide.description}</p>
                  </div>
                </div>

                <ul className="space-y-3 pl-14">
                  {guide.content.map((item, i) => (
                    <li key={i} className="text-sm text-foreground/80 leading-relaxed flex items-start gap-2">
                      <span className="text-muted-foreground select-none">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>

          <div className="h-px bg-border" />

          {/* Contact Section */}
          <section className="text-center py-8">
            <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg text-foreground mb-2">Still have questions?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Reach out to our support team and we'll get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@mystorefront.io"
              className="text-sm uppercase tracking-[0.15em] text-foreground hover:opacity-70 transition-opacity inline-flex items-center gap-1.5"
            >
              Email Support
              <ArrowRight className="w-4 h-4" />
            </a>
          </section>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
