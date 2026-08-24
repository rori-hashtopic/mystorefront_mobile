import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeStepProps {
  displayName: string;
}

export function WelcomeStep({ displayName }: WelcomeStepProps) {
  const [logos, setLogos] = useState<string[]>([]);

  useEffect(() => {
    supabase.rpc("get_public_brand_logos").then(({ data, error }) => {
      if (error || !data) return;
      const urls = (data as any[]).map((b) => b.logo_url).filter(Boolean) as string[];
      if (urls.length === 0) return;
      // Repeat enough times to fill the track seamlessly, then duplicate for the loop.
      const repeats = Math.max(1, Math.ceil(12 / urls.length));
      const base = Array.from({ length: repeats }, () => urls).flat();
      setLogos([...base, ...base]);
    });
  }, []);

  return (
    <div>
      {logos.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-lg border border-border/40 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-center mb-4">
            Brands on MyStorefront
          </p>
          <div className="overflow-hidden">
            <div className="flex items-center gap-10 brand-logo-track">
              {logos.map((url, i) => (
                <div key={i} className="shrink-0 flex items-center justify-center w-[90px] h-[22px]">
                  <img
                    src={url}
                    alt=""
                    className="max-w-full max-h-full object-contain brand-logo-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes brandLogoScroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .brand-logo-track {
              width: max-content;
              animation: brandLogoScroll 30s linear infinite;
            }
            .brand-logo-img {
              filter: grayscale(100%) brightness(0.45) contrast(0.9);
              opacity: 0.5;
            }
          `}</style>
        </div>
      )}

      <h2 className="font-display text-3xl text-foreground mb-3 leading-tight">Hi, {displayName || "there"}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
        Welcome to MyStorefront. Let's get you set up to turn your recommendations into earnings.
      </p>

      <div className="mt-6 space-y-0">
        {[
          { num: "01", label: "Create shoppable links" },
          { num: "02", label: "Track your earnings" },
          { num: "03", label: "Partner with brands" },
        ].map((item) => (
          <div key={item.num} className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
            <span className="text-[10px] text-muted-foreground tracking-wide font-medium">{item.num}</span>
            <span className="text-sm text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
