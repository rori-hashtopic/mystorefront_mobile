import { useState } from "react";
import { Search, ChevronRight, ExternalLink, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I set up my MyStorefront profile?",
        a: "Complete the onboarding steps by adding your display name, bio, profile image, social accounts, and creator interests. This helps brands understand your audience and keeps your storefront ready to share.",
      },
      {
        q: "How do I add products to my storefront?",
        a: "Add a product by URL. MyStorefront creates tracked affiliate links so sales can be attributed back to you.",
      },
      {
        q: "Can anyone create a creator account?",
        a: "MyStorefront is currently invite-only for creators. If you've been invited, follow the link in your email and verify your email address before signing in.",
      },
    ],
  },
  {
    category: "Earnings & Payments",
    questions: [
      {
        q: "When can I start earning commission?",
        a: "We're onboarding the first cohort of SA brands now. Once brands go live on the Explore page, you can add their products to your storefront and start earning on every confirmed sale.",
      },
      {
        q: "How do I get paid for my sales?",
        a: "Earnings are paid manually in ZAR via EFT. Add your payout details on the Earnings page, then request a payout once eligible earnings are available after the refund buffer period.",
      },
      {
        q: "What commission rates can I earn?",
        a: "Commission rates are set per brand and product. You can review the rate before adding or sharing a tracked product link.",
      },
      {
        q: "Why are some earnings not available yet?",
        a: "New sales move through statuses like Pending, Refund Buffer, Processing, and Paid. The refund buffer protects against returns before earnings become payable.",
      },
    ],
  },
  {
    category: "Shop Management",
    questions: [
      {
        q: "Can I organise products into collections?",
        a: "Yes. Collections help you group products by theme, category, campaign, or audience need so your public storefront is easier to browse.",
      },
      {
        q: "How do I hide a collection without deleting it?",
        a: "Click the menu button on a collection and select 'Hide collection'. Hidden collections won't appear on your public storefront but can be unhidden anytime.",
      },
      {
        q: "Where can I share my storefront?",
        a: "Share your public storefront link on Instagram, TikTok, WhatsApp, email, or anywhere your audience shops from. Product clicks and attributed sales are tracked from your links.",
      },
    ],
  },
  {
    category: "Account & Profile",
    questions: [
      {
        q: "How do I edit my profile?",
        a: "Click 'Edit profile' at the top of your storefront page to update your photo, bio, social links, and more.",
      },
      {
        q: "How do I connect my Instagram?",
        a: "Go to Settings > Social Accounts and choose Connect Instagram. Instagram connection requires a Creator or Business Instagram account linked to a Facebook Page.",
      },
      {
        q: "What are the creator tiers?",
        a: "Creators move through Insider, Featured, and Tastemaker tiers. Higher tiers unlock more brand opportunities, discount codes, gifting, messaging, and priority collaboration features.",
      },
    ],
  },
];

export function HelpModal({ isOpen, onClose, onOpenChat }: HelpModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = FAQ_ITEMS.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((category) => category.questions.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Help Center</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* FAQs */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((category) => (
                <div key={category.category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{category.category}</h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.category}-${index}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-sm text-left hover:no-underline">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => {
                onClose();
                onOpenChat();
              }}
              className="w-full gap-2"
              variant="outline"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Support
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
