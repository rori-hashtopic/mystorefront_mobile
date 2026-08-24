import { useState } from "react";
import { Check, ArrowRight, MessageCircle, Instagram, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ShareShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
}

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153Zm-1.292 19.492h2.039L6.486 3.24H4.298l13.311 17.405Z" />
  </svg>
);

const buildCreatorShopUrl = (username: string | null) => {
  const normalizedUsername = username?.trim().replace(/^\/+|\/+$/g, "") || "";
  return normalizedUsername
    ? `${window.location.origin}/${encodeURIComponent(normalizedUsername)}`
    : window.location.origin;
};

export function ShareShopModal({ isOpen, onClose, username }: ShareShopModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shopUrl = buildCreatorShopUrl(username);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "MyStorefront URL copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`Check out MyStorefront: ${shopUrl}`)}`,
      onClick: undefined,
    },
    {
      name: "Instagram",
      icon: Instagram,
      href: null,
      onClick: () => {
        handleCopy();
        toast({
          title: "Link copied!",
          description: "Paste the link in your Instagram bio or story",
        });
      },
    },
    {
      name: "X (Twitter)",
      icon: XLogo,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shopUrl)}&text=${encodeURIComponent("Check out MyStorefront!")}`,
      onClick: undefined,
    },
    {
      name: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent("Check out MyStorefront!")}&body=${encodeURIComponent(`I wanted to share MyStorefront with you: ${shopUrl}`)}`,
      onClick: undefined,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Editorial Header */}
          <div className="mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sharing</span>
            <DialogTitle asChild>
              <h2 className="font-display text-2xl sm:text-3xl mt-1">Share your storefront</h2>
            </DialogTitle>
            <div className="h-px bg-border mt-4" />
          </div>

          <div className="space-y-6">
            {/* URL Display - Editorial Style */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your Link</span>
              <p className="text-sm text-muted-foreground font-mono break-all">{shopUrl}</p>
              <button
                onClick={handleCopy}
                className="text-sm inline-flex items-center gap-1.5 hover:underline underline-offset-4 transition-all min-h-[44px] group"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <span className="group-hover:underline">Copy Link</span>
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>

            <div className="h-px bg-border" />

            {/* Share Options - Text Based List */}
            <div className="space-y-0">
              {shareLinks.map((link, index) => {
                const Icon = link.icon;

                return (
                  <div key={link.name}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between py-4 text-sm hover:text-muted-foreground transition-colors min-h-[44px] group"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>Share via {link.name}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <button
                        onClick={link.onClick}
                        className="w-full flex items-center justify-between py-4 text-sm hover:text-muted-foreground transition-colors min-h-[44px] group text-left"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>Copy for {link.name}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    {index < shareLinks.length - 1 && <div className="h-px bg-border" />}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
