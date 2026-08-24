import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, Instagram, Loader2, ArrowRight } from "lucide-react";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

interface SocialsStepProps {
  data: {
    instagramHandle: string;
    instagramConnected: boolean;
    tiktokHandle: string;
    tiktokConnected?: boolean;
    youtubeUrl: string;
    otherUrls: string;
  };
  onChange: (data: Partial<SocialsStepProps["data"]>) => void;
}

export function SocialsStep({ data, onChange }: SocialsStepProps) {
  const [connectingInstagram, setConnectingInstagram] = useState(false);

  const { instagramConnection, connectInstagram } = useSocialConnections();

  useEffect(() => {
    if (instagramConnection && instagramConnection.status === "connected") {
      onChange({
        instagramConnected: true,
        instagramHandle: instagramConnection.username,
      });
    }
  }, [instagramConnection, onChange]);

  const handleInstagramConnect = async () => {
    setConnectingInstagram(true);
    await connectInstagram(window.location.pathname || "/");
    setConnectingInstagram(false);
  };

  const isInstagramConnected = instagramConnection?.status === "connected" || data.instagramConnected;
  const instagramHandle = instagramConnection?.username ? instagramConnection.username : data.instagramHandle;

  return (
    <div>
      <h2 className="font-display text-3xl text-foreground mb-2">Link Your Socials</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Connect your social accounts to help brands discover you. Instagram is required.
      </p>

      <div className="space-y-5 sm:space-y-0">
        {/* Instagram */}
        <div className="py-1 sm:py-3 sm:border-b sm:border-border">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
            Instagram <span className="text-destructive normal-case tracking-normal">*</span>
          </span>
          {isInstagramConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-foreground" />
                <span className="text-sm text-foreground">@{instagramHandle?.replace(/^@+/, "")}</span>
              </div>
              <Check className="h-4 w-4 text-foreground" />
            </div>
          ) : (
            <>
              <InAppBrowserNotice className="mb-3" />
              <button
                type="button"
                onClick={handleInstagramConnect}
                disabled={connectingInstagram}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                {connectingInstagram ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4" /> Connect Instagram <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* TikTok */}
        <div className="py-1 sm:py-3 sm:border-b sm:border-border">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">TikTok</span>
          <div className="flex items-center gap-3">
            <TikTokIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="@yourhandle"
              value={data.tiktokHandle}
              onChange={(e) => onChange({ tiktokHandle: e.target.value })}
              className="border-0 border-b border-border rounded-none bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-foreground transition-colors"
            />
          </div>
        </div>

        {/* YouTube */}
        <div className="py-1 sm:py-3 sm:border-b sm:border-border">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">YouTube</span>
          <Input
            placeholder="https://youtube.com/@yourchannel"
            value={data.youtubeUrl}
            onChange={(e) => onChange({ youtubeUrl: e.target.value })}
            className="border-0 border-b border-border rounded-none bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-foreground transition-colors"
          />
        </div>

        {/* Other */}
        <div className="py-1 sm:py-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Other URLs</span>
          <Input
            placeholder="https://yourwebsite.com"
            value={data.otherUrls}
            onChange={(e) => onChange({ otherUrls: e.target.value })}
            className="border-0 border-b border-border rounded-none bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-foreground transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
