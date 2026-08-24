import { ease } from "../utils";

export default function Scene1Opening({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;

  // Eyebrow (FOR BRANDS) — appears first, anchors the audience
  const eyebrowT = ease.outCubic(Math.min(1, t / 0.7));

  // Wordmark + logo — appears slightly after the eyebrow
  const wordT = ease.outCubic(Math.min(1, Math.max(0, (t - 0.3) / 0.9)));
  const wordOpacity = wordT;
  const wordScale = 0.94 + 0.06 * wordT;

  // Tagline — appears last
  const taglineY = 24 - 24 * ease.outCubic(Math.min(1, Math.max(0, (t - 0.9) / 1.0)));
  const taglineOpacity = ease.outCubic(Math.min(1, Math.max(0, (t - 0.9) / 1.0)));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      {/* Eyebrow — "FOR BRANDS" anchors the audience immediately */}
      <div
        className="mb-6 sm:mb-8 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-medium text-primary"
        style={{ opacity: eyebrowT, transform: `translateY(${(1 - eyebrowT) * -8}px)` }}
      >
        For brands
      </div>

      <div
        className="flex items-center gap-3 sm:gap-4"
        style={{ opacity: wordOpacity, transform: `scale(${wordScale})` }}
      >
        <svg
          viewBox="0 0 4000 4000"
          className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="4000" height="4000" rx="728" fill="hsl(var(--primary))" />
          <path
            d="M3295 1560.76C3295.2 1648.89 3277.92 1736.19 3244.17 1817.6C3210.42 1899.01 3160.87 1972.93 3098.38 2035.06L2065.53 3083.39C2056.92 3092.13 2046.66 3099.08 2035.34 3103.82C2024.02 3108.56 2011.87 3111 1999.6 3111C1987.33 3111 1975.19 3108.56 1963.87 3103.82C1952.55 3099.08 1942.29 3092.13 1933.68 3083.39L900.832 2035.06C774.911 1909.27 704.109 1738.59 704 1560.59C703.892 1382.58 774.486 1211.82 900.254 1085.87C1026.02 959.926 1196.66 889.109 1374.63 889C1552.6 888.892 1723.32 959.501 1849.25 1085.29L1999.6 1225.85L2151 1084.83C2244.97 991.311 2364.53 927.733 2494.6 902.124C2624.66 876.514 2759.4 890.022 2881.79 940.941C3004.19 991.86 3108.76 1077.91 3182.3 1188.22C3255.84 1298.53 3295.06 1428.17 3295 1560.76Z"
            fill="white"
          />
        </svg>
        <div className="font-display text-5xl sm:text-7xl md:text-8xl tracking-tight text-foreground">MyStorefront</div>
      </div>
      <div
        className="mt-5 sm:mt-7 text-sm sm:text-base tracking-[0.25em] uppercase text-muted-foreground text-center"
        style={{ opacity: taglineOpacity, transform: `translateY(${taglineY}px)` }}
      >
        Creator affiliate platform
      </div>
      <div className="mt-6 sm:mt-10 h-px w-24 bg-foreground/30" style={{ opacity: taglineOpacity }} />
    </div>
  );
}
