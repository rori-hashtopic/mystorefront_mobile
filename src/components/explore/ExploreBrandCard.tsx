import { Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";

export interface ExploreBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  commissionPercent: number | null;
  isPartner: boolean;
  isTrending: boolean;
}

interface ExploreBrandCardProps {
  brand: ExploreBrand;
  showCommission?: boolean;
  /** When true, display the net rate after MyStorefront's 20% platform fee. */
  netRate?: boolean;
}

export function ExploreBrandCard({
  brand,
  showCommission = false,
  netRate = false,
}: ExploreBrandCardProps) {
  const displayCommission =
    brand.commissionPercent !== null
      ? netRate
        ? Math.round(brand.commissionPercent * 0.8 * 100) / 100
        : brand.commissionPercent
      : null;
  return (
    <article className="group">
      {/* Hero Image */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted mb-4 sm:mb-5">
        {brand.heroImageUrl ? (
          <img
            src={brand.heroImageUrl}
            alt={brand.name}
            loading="lazy"
            className="w-full h-full object-cover transition-all duration-500"
          />
        ) : brand.logoUrl ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <img
              src={brand.logoUrl}
              alt={brand.name}
              loading="lazy"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain opacity-60"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1.5 sm:space-y-2">
        <h3 className="font-display text-lg sm:text-xl md:text-2xl text-foreground">
          {brand.name}
        </h3>
        
        {brand.websiteUrl && (
          <p className="text-xs text-muted-foreground truncate">
            {brand.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </p>
        )}

        {brand.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 hidden sm:block">
            {brand.description}
          </p>
        )}

        {/* Commission - only visible to creators/admins */}
        {showCommission && displayCommission !== null && (
          <p className="text-xs text-muted-foreground">
            {displayCommission}% commission
          </p>
        )}

        {/* CTA */}
        <Link 
          to={`/b/${brand.slug}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground pt-2 group/link min-h-[44px]"
        >
          <span className="border-b border-transparent group-hover/link:border-foreground transition-colors">
            View Brand
          </span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* Separator */}
      <div className="h-px bg-border mt-5 sm:mt-6" />
    </article>
  );
}
