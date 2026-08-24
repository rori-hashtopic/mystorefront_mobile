import { ease, formatRand } from "../utils";

const bars = [0.4, 0.55, 0.45, 0.7, 0.65, 0.85, 1.0];
const days = ["M", "T", "W", "T", "F", "S", "S"];
const topCreators = [
  {
    name: "Emma K.",
    initials: "EK",
    amt: 12400,
    bg: "hsl(15 60% 90%)",
    avatar: "/creators/lerato-tiktok.png",
    avatarPos: "center 28%",
  },
  {
    name: "Lerato M.",
    initials: "LM",
    amt: 8950,
    bg: "hsl(35 40% 88%)",
    avatar: "/creators/lerato-avatar.png",
    avatarPos: "center",
  },
  {
    name: "Naledi P.",
    initials: "NP",
    amt: 6200,
    bg: "hsl(20 35% 86%)",
    avatar: "/creators/naledi-avatar.png",
    avatarPos: "center",
  },
  {
    name: "Lily D.",
    initials: "LD",
    amt: 4830,
    bg: "hsl(40 30% 90%)",
    avatar: "/creators/lily-avatar.png",
    avatarPos: "center",
  },
];

// Emma's full creator profile shown in the modal
const EMMA_PROFILE = {
  name: "Emma K.",
  initials: "EK",
  bg: "hsl(15 60% 90%)",
  avatar: "/creators/lerato-tiktok.png",
  avatarPos: "center 28%",
  tags: ["Beauty", "Lifestyle"],
  verified: true,
  totalSales: "R 12,400",
  instagram: [
    { label: "Followers", value: "45.2K" },
    { label: "Engagement", value: "4.5%" },
    { label: "Reach", value: "14.1K" },
    { label: "Avg likes", value: "1.8K" },
    { label: "Avg comments", value: "84" },
  ],
};

/**
 * Scene 4 — Brand Dashboard with embedded Creator Analytics modal.
 *
 * Timing (within ~10.5s scene window):
 *   0.0 – 0.7:  dashboard fades in
 *   0.4 – 2.4:  Total sales counter ticks up
 *   0.8 – 1.7:  top creators list staggers in
 *   1.0 – 2.0:  bar chart bars grow
 *   2.5 – 5.3:  caption "Every sale, every creator — tracked in real time."
 *   4.5 – 5.5:  cursor enters from upper-right, travels to Emma's row
 *   5.5 – 5.7:  click pulse on Emma's row
 *   5.7 – 6.5:  modal scales in with backdrop dim
 *   6.5 – 10.0: modal held (caption "Click into any creator for their full analytics.")
 *   10.0 – 10.5: modal fades out, ready for transition
 */
export default function Scene4Dashboard({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const intro = ease.outCubic(Math.min(1, t / 0.7));

  // Total sales ticker: 0.4–2.4s
  const tickerT = Math.min(1, Math.max(0, (t - 0.4) / 2.0));
  const total = ease.outQuart(tickerT) * 47830;

  // Cursor: visible 4.5–6.0s. Travels from upper-right toward Emma's row.
  // Cursor is rendered as an absolute overlay positioned within the dashboard
  // container; we use percentages so it lands roughly on Emma's row across
  // both mobile and desktop layouts.
  const cursorVisible = t >= 4.5 && t < 6.0;
  const cursorJourneyT = Math.max(0, Math.min(1, (t - 4.5) / 1.0));
  const cursorE = ease.inOutCubic(cursorJourneyT);

  // Click pulse: 5.5–5.7s
  const clickT = Math.max(0, Math.min(1, (t - 5.5) / 0.2));
  const rowGlow = clickT > 0 && clickT < 1 ? Math.sin(clickT * Math.PI) : 0;
  const rowScale = clickT > 0 && clickT < 1 ? 1 + 0.03 * Math.sin(clickT * Math.PI) : 1;

  // Modal: scales in 5.7–6.5s, holds, fades out 10.0–10.5s
  const modalEnterT = Math.max(0, Math.min(1, (t - 5.7) / 0.8));
  const modalEnterE = ease.outBack(modalEnterT);
  const modalOpacity = t < 5.7 ? 0 : t > 10.0 ? Math.max(0, 1 - (t - 10.0) / 0.5) : ease.outCubic(modalEnterT);
  const modalScale = 0.85 + 0.15 * modalEnterE;

  // Backdrop dim follows modal entrance
  const backdropOpacity = modalOpacity * 0.5;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8">
      <div
        className="relative w-full max-w-[640px] border border-foreground/15 bg-card p-3 sm:p-6"
        style={{ opacity: intro, transform: `translateY(${16 - 16 * intro}px)` }}
      >
        {/* Header — tighter margin on mobile */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Brand dashboard</div>
            <div className="font-display text-base sm:text-lg text-foreground mt-0.5">Live activity</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live
          </div>
        </div>

        {/* Metrics — smaller padding/text on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-4">
          <div className="border border-foreground/10 p-2 sm:p-3">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Total sales</div>
            <div className="font-display text-base sm:text-2xl mt-0.5 sm:mt-1">{formatRand(total)}</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-700 mt-0.5 sm:mt-1">↑ R 2,140 today</div>
          </div>
          <div className="border border-foreground/10 p-2 sm:p-3">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
              Active creators
            </div>
            <div className="font-display text-base sm:text-2xl mt-0.5 sm:mt-1">14</div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1">3 new this week</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Top creators */}
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-1 sm:mb-2">
              Top creators
            </div>
            <div className="divide-y divide-foreground/10">
              {topCreators.map((c, i) => {
                const rowT = ease.outCubic(Math.min(1, Math.max(0, (t - 0.8 - i * 0.15) / 0.5)));
                const isEmma = i === 0;
                return (
                  <div
                    key={c.name}
                    className="relative flex items-center gap-2 py-1 sm:py-1.5 text-[11px] sm:text-xs"
                    style={{
                      opacity: rowT,
                      transform: `translateX(${(1 - rowT) * -8}px) scale(${isEmma ? rowScale : 1})`,
                      transformOrigin: "left center",
                      boxShadow:
                        isEmma && rowGlow > 0
                          ? `0 0 0 1.5px hsl(var(--primary) / ${rowGlow * 0.7}), 0 4px 12px -4px hsl(var(--primary) / ${rowGlow * 0.4})`
                          : undefined,
                      borderRadius: isEmma && rowGlow > 0 ? "6px" : undefined,
                      transition: "box-shadow 100ms linear",
                    }}
                  >
                    <div
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[8px] sm:text-[9px] font-medium text-foreground/70"
                      style={{ background: c.bg }}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: c.avatarPos }}
                        draggable={false}
                      />
                    </div>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatRand(c.amt)}</span>
                    {/* Cursor — only on Emma's row. Renders inside the row so
                        positioning is relative to her row regardless of mobile
                        vs desktop layout. Animates from above-right of the row
                        down onto it, then click pulse fires on the row itself. */}
                    {isEmma && cursorVisible && (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="absolute pointer-events-none z-20"
                        style={{
                          // Start: above-right of the row, slightly outside
                          // End: middle-right of the row, near the amount
                          right: `${10 + (1 - cursorE) * 5}%`,
                          top: `${-100 + cursorE * 110}%`,
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                        }}
                      >
                        <path
                          d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z"
                          fill="white"
                          stroke="black"
                          strokeWidth="1"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Bar chart — shorter on mobile */}
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-1 sm:mb-2">
              Sales · last 7 days
            </div>
            <div className="flex items-end gap-1.5 h-16 sm:h-20">
              {bars.map((h, i) => {
                const start = 1.0 + i * 0.12;
                const bt = ease.outCubic(Math.min(1, Math.max(0, (t - start) / 0.45)));
                return <div key={i} className="flex-1 bg-foreground" style={{ height: `${h * 100 * bt}%` }} />;
              })}
            </div>
            <div className="flex gap-1.5 mt-1">
              {days.map((d, i) => (
                <div key={i} className="flex-1 text-[9px] text-muted-foreground text-center">
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Backdrop dim — covers the dashboard during modal display */}
        {backdropOpacity > 0.01 && (
          <div
            className="absolute inset-0 bg-foreground rounded-sm pointer-events-none z-10"
            style={{ opacity: backdropOpacity }}
          />
        )}

        {/* Modal — Emma's full analytics */}
        {modalOpacity > 0.01 && (
          <div
            className="absolute inset-0 flex items-center justify-center px-3 sm:px-4 z-20 pointer-events-none"
            style={{ opacity: modalOpacity }}
          >
            <div
              className="bg-card border-2 border-primary/40 rounded-xl p-4 sm:p-6 w-full max-w-md"
              style={{
                transform: `scale(${modalScale})`,
                boxShadow: "0 16px 48px -16px hsl(var(--primary) / 0.3), 0 0 0 1px hsl(var(--foreground) / 0.05)",
              }}
            >
              {/* Header: avatar + name + verified + tags */}
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: EMMA_PROFILE.bg }}
                >
                  <img
                    src={EMMA_PROFILE.avatar}
                    alt={EMMA_PROFILE.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: EMMA_PROFILE.avatarPos }}
                    draggable={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-medium text-foreground leading-tight">
                      {EMMA_PROFILE.name}
                    </span>
                    {EMMA_PROFILE.verified && (
                      <svg
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                      >
                        <path d="M6 0L7.5 1.8L9.8 1.5L10.5 3.6L12 5L11 6.8L11.5 9L9.5 9.8L8.5 12L6 11L3.5 12L2.5 9.8L0.5 9L1 6.8L0 5L1.5 3.6L2.2 1.5L4.5 1.8L6 0ZM5.2 7.6L8.4 4.4L7.6 3.6L5.2 6L4.4 5.2L3.6 6L5.2 7.6Z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {EMMA_PROFILE.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center bg-foreground text-background rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hero block: Total sales — the brand-relevant outcome metric */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-primary font-medium">
                  Total sales
                </div>
                <div className="font-display text-xl sm:text-3xl text-foreground mt-0.5 sm:mt-1 leading-none">
                  {EMMA_PROFILE.totalSales}
                </div>
              </div>

              {/* Instagram analytics — supporting metrics in a 2-col grid */}
              <div>
                <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Instagram analytics
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {EMMA_PROFILE.instagram.map((m) => (
                    <div key={m.label}>
                      <div className="text-[7px] sm:text-[9px] uppercase tracking-wider text-muted-foreground leading-tight">
                        {m.label}
                      </div>
                      <div className="text-sm sm:text-base font-medium text-foreground mt-0.5 leading-tight">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
