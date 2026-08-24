import { ease } from "../utils";

/**
 * Scene — Creator Analytics. Plays after Scene 4 (Brand Dashboard).
 *
 * The cursor clicks on a top creator (Lerato M., the highest earner from
 * the dashboard's top creators list) and her full analytics card scales in.
 * Reinforces that real per-creator data exists, building trust before the
 * commission scene.
 *
 * Numbers represent a typical SA mid-tier creator: ~45K followers, strong
 * engagement, healthy reach.
 *
 * Timing (within ~5s scene window):
 *   0.0 – 0.4: dashboard row visible, cursor hovering over Lerato's row
 *   0.4 – 0.6: click pulse on the row
 *   0.6 – 1.4: row fades out, full analytics card scales in
 *   1.4 – 4.5: card held visible
 *   4.5 – 5.0: ready for transition
 */

const CREATOR = {
  initials: "LM",
  name: "Lerato M.",
  bg: "hsl(15 60% 90%)",
  tags: ["Beauty", "Lifestyle"],
  verified: true,
  metrics: [
    { label: "Followers", value: "45.2K" },
    { label: "Engagement", value: "4.5%" },
    { label: "Reach", value: "14.1K" },
    { label: "Avg likes", value: "1.8K" },
    { label: "Avg comments", value: "84" },
    { label: "Total sales", value: "R 12,400" },
  ],
};

export default function SceneCreatorAnalytics({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;

  // Phase 1: Row visible 0.0–0.6s (with click pulse at 0.4–0.6s)
  // Phase 2: Row fades out 0.6–0.9s
  // Phase 3: Analytics card scales in 0.7–1.4s (slight overlap)
  // Phase 4: Card held until ~4.5s
  // Phase 5: Card fades out 4.5–5.0s

  const rowOpacity = t < 0.6 ? 1 : t < 0.9 ? 1 - (t - 0.6) / 0.3 : 0;

  // Click pulse (0.4–0.6s)
  const clickT = Math.max(0, Math.min(1, (t - 0.4) / 0.2));
  const rowScale = clickT > 0 && clickT < 1 ? 1 + 0.04 * Math.sin(clickT * Math.PI) : 1;
  const rowHighlight = clickT > 0 ? Math.sin(clickT * Math.PI) : 0;

  // Card entrance: 0.7–1.4s
  const cardEnterT = Math.max(0, Math.min(1, (t - 0.7) / 0.7));
  const cardEnterE = ease.outBack(cardEnterT);
  const cardOpacity = t < 0.7 ? 0 : t > 4.5 ? Math.max(0, 1 - (t - 4.5) / 0.5) : ease.outCubic(cardEnterT);
  const cardScale = 0.85 + 0.15 * cardEnterE;
  const cardTranslateY = (1 - cardEnterE) * 16;

  // Cursor: visible during phase 1, hovering over the row, with click motion
  const cursorVisible = t < 1.0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8">
      {/* Dashboard row — fades out as card scales in */}
      {rowOpacity > 0 && (
        <div
          className="relative w-full max-w-md"
          style={{
            opacity: rowOpacity,
            transform: `scale(${rowScale})`,
          }}
        >
          {/* Mini context label */}
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground text-center mb-3">
            Top creator
          </div>
          {/* The row itself — same look as dashboard's top creator list */}
          <div
            className="border border-foreground/12 bg-card rounded-lg p-3 sm:p-4 flex items-center gap-3"
            style={{
              boxShadow:
                rowHighlight > 0
                  ? `0 0 0 2px hsl(var(--primary) / ${rowHighlight * 0.6}), 0 8px 24px -8px hsl(var(--primary) / ${rowHighlight * 0.3})`
                  : undefined,
              transition: "box-shadow 100ms linear",
            }}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: CREATOR.bg }}
            >
              <span className="text-xs sm:text-sm font-medium text-foreground/70">{CREATOR.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-medium leading-tight">{CREATOR.name}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Beauty & Lifestyle</div>
            </div>
            <div className="text-sm sm:text-base font-medium text-foreground shrink-0">R 12,400</div>
          </div>

          {/* Cursor */}
          {cursorVisible && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="absolute pointer-events-none"
              style={{
                // Position cursor over the right side of the row near the value
                right: "20%",
                top: "60%",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}
            >
              <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill="white" stroke="black" strokeWidth="1" />
            </svg>
          )}
        </div>
      )}

      {/* Full analytics card — scales in after click */}
      {cardOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex items-center justify-center px-4 sm:px-8"
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale}) translateY(${cardTranslateY}px)`,
          }}
        >
          <div
            className="border-2 border-primary/40 bg-card rounded-xl p-4 sm:p-6 w-full max-w-md"
            style={{
              boxShadow: "0 12px 40px -12px hsl(var(--primary) / 0.25)",
            }}
          >
            {/* Header: avatar + name + verified tick */}
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: CREATOR.bg }}
              >
                <span className="text-base sm:text-lg font-medium text-foreground/70">{CREATOR.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-medium text-foreground leading-tight">{CREATOR.name}</span>
                  {CREATOR.verified && (
                    <svg
                      className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path d="M6 0L7.5 1.8L9.8 1.5L10.5 3.6L12 5L11 6.8L11.5 9L9.5 9.8L8.5 12L6 11L3.5 12L2.5 9.8L0.5 9L1 6.8L0 5L1.5 3.6L2.2 1.5L4.5 1.8L6 0ZM5.2 7.6L8.4 4.4L7.6 3.6L5.2 6L4.4 5.2L3.6 6L5.2 7.6Z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {CREATOR.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center bg-foreground text-background rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics grid — 3 cols × 2 rows */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-foreground/10">
              {CREATOR.metrics.map((m) => (
                <div key={m.label}>
                  <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">
                    {m.label}
                  </div>
                  <div className="font-display text-base sm:text-xl text-foreground mt-1 leading-tight">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
