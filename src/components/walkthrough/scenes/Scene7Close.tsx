import { ease } from "../utils";

export default function Scene7Close({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  // Background sweep — circular reveal
  const sweepT = ease.inOutCubic(Math.min(1, t / 0.4));
  const wordT = ease.outCubic(Math.min(1, Math.max(0, (t - 0.3) / 0.7)));
  const launchT = ease.outCubic(Math.min(1, Math.max(0, (t - 0.9) / 0.6)));
  const ctaT = ease.outBack(Math.min(1, Math.max(0, (t - 1.5) / 0.7)));

  // Heart logo drop — starts at 1.8s, lands at 2.2s with a slight bounce
  const heartT = Math.min(1, Math.max(0, (t - 1.8) / 0.4));
  const heartE = ease.outBack(heartT);
  // Heart starts 120px above its final position and drops in
  const heartTranslateY = (1 - heartE) * -120;
  const heartOpacity = ease.outCubic(heartT);

  // Content shift — two-beat motion:
  //   Beat 1 (1.8–2.15s): text pushes down as heart lands (peaks at ~50px)
  //   Beat 2 (2.15–2.55s): text pushes back up to original position
  let contentShiftY = 0;
  if (t >= 1.8 && t < 2.15) {
    // Push down phase
    const downT = (t - 1.8) / 0.35;
    contentShiftY = ease.outCubic(downT) * 50;
  } else if (t >= 2.15 && t < 2.55) {
    // Rebound phase — push back up to original (0)
    const upT = (t - 2.15) / 0.4;
    contentShiftY = 50 - ease.outCubic(upT) * 50;
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* sweep background */}
      <div
        className="absolute inset-0 bg-primary"
        style={{
          clipPath: `circle(${sweepT * 160}% at 50% 50%)`,
        }}
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ color: "hsl(var(--primary-foreground))" }}
      >
        {/* Heart logo — drops in from above at the end */}
        {heartT > 0 && (
          <div
            className="mb-4"
            style={{
              opacity: heartOpacity,
              transform: `translateY(${heartTranslateY}px)`,
            }}
          >
            <svg
              viewBox="0 0 4000 4000"
              className="h-16 w-16 sm:h-20 sm:w-20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="4000" height="4000" rx="728" fill="#FFFFFF" />
              <path
                d="M3295 1560.76C3295.2 1648.89 3277.92 1736.19 3244.17 1817.6C3210.42 1899.01 3160.87 1972.93 3098.38 2035.06L2065.53 3083.39C2056.92 3092.13 2046.66 3099.08 2035.34 3103.82C2024.02 3108.56 2011.87 3111 1999.6 3111C1987.33 3111 1975.19 3108.56 1963.87 3103.82C1952.55 3099.08 1942.29 3092.13 1933.68 3083.39L900.832 2035.06C774.911 1909.27 704.109 1738.59 704 1560.59C703.892 1382.58 774.486 1211.82 900.254 1085.87C1026.02 959.926 1196.66 889.109 1374.63 889C1552.6 888.892 1723.32 959.501 1849.25 1085.29L1999.6 1225.85L2151 1084.83C2244.97 991.311 2364.53 927.733 2494.6 902.124C2624.66 876.514 2759.4 890.022 2881.79 940.941C3004.19 991.86 3108.76 1077.91 3182.3 1188.22C3255.84 1298.53 3295.06 1428.17 3295 1560.76Z"
                fill="hsl(var(--primary))"
              />
            </svg>
          </div>
        )}

        {/* Text content cluster — shifts down when heart drops in */}
        <div style={{ transform: `translateY(${contentShiftY}px)` }}>
          <div
            className="font-display text-5xl sm:text-7xl tracking-tight"
            style={{
              opacity: wordT,
              transform: `translateY(${(1 - wordT) * 16}px)`,
            }}
          >
            MyStorefront
          </div>
          <div className="mt-3 text-[11px] sm:text-xs uppercase tracking-[0.3em]" style={{ opacity: launchT }}>
            Launching June 2026
          </div>
          <a
            href="mailto:roxi@mystorefront.io?subject=MyStorefront%20launch%20%E2%80%94%20interested%20in%20joining"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-background text-foreground px-6 py-3 text-sm sm:text-base font-medium hover:bg-background/90 transition-colors text-center"
            style={{
              opacity: Math.max(0, Math.min(1, ctaT)),
              transform: `scale(${0.9 + 0.1 * Math.max(0, Math.min(1, ctaT))})`,
              pointerEvents: t > 1.8 ? "auto" : "none",
            }}
          >
            Join the launch
          </a>
          <div className="mt-4 text-[11px] sm:text-xs opacity-80" style={{ opacity: launchT * 0.8 }}>
            200+ SA creators on the launch waitlist
          </div>
        </div>
      </div>
    </div>
  );
}
