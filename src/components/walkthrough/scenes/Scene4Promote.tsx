import { Heart, MessageCircle, Send, Music2, Megaphone } from "lucide-react";
import { ease } from "../utils";

/**
 * Scene 4 — Step 2 · Promote.
 *
 * Layout mirrors Scene2Flow exactly (step pill on top, phone in middle,
 * placeholder dots at bottom) so the phone sits at the same vertical position
 * across Scene 2a → Scene4Promote → Scene 2b.
 */

const PHONE_WIDTH = 200;
const PHONE_HEIGHT = 400;

const SkincareTagIllustration = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    <rect
      x="32"
      y="14"
      width="16"
      height="6"
      rx="1"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="hsl(var(--foreground) / 0.06)"
    />
    <rect
      x="34"
      y="20"
      width="12"
      height="6"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="hsl(var(--foreground) / 0.04)"
    />
    <path
      d="M28 26 Q26 28 26 32 L26 64 Q26 68 30 68 L50 68 Q54 68 54 64 L54 32 Q54 28 52 26 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="hsl(var(--foreground) / 0.04)"
    />
    <line x1="28" y1="44" x2="52" y2="44" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" />
    <line x1="28" y1="50" x2="52" y2="50" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" />
  </svg>
);

const AbstractCreatorFigure = () => (
  <img
    src="/creators/lerato-tiktok.png"
    alt="Emma"
    className="absolute inset-0 w-full h-full object-cover"
    draggable={false}
  />
);

const AbstractAvatar = () => (
  <img
    src="/creators/lerato-tiktok.png"
    alt="Emma"
    className="h-full w-full object-cover"
    style={{ objectPosition: "center 28%" }}
    draggable={false}
  />
);

export default function Scene4Promote({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const intro = ease.outCubic(Math.min(1, t / 0.8));

  // Caption typewriter
  const captionStart = 1.6;
  const captionDuration = 1.0;
  const captionFullText = "This skincare set changed my routine ✨";
  const captionT = Math.max(0, Math.min(1, (t - captionStart) / captionDuration));
  const captionVisibleChars = Math.floor(captionT * captionFullText.length);
  const captionText = captionFullText.slice(0, captionVisibleChars);
  const captionTyping = captionVisibleChars > 0 && captionVisibleChars < captionFullText.length;

  // Engagement fade-in
  const engStart = 2.6;
  const engT = Math.max(0, Math.min(1, (t - engStart) / 0.4));
  const engOpacity = ease.outCubic(engT);

  const likeBase = 2_840;
  const likeRise = Math.max(0, t - 2.8);
  const likeCount = Math.floor(likeBase + likeRise * 240);
  const heartScale = likeRise > 0 ? 1 + 0.08 * Math.abs(Math.sin(likeRise * 4)) : 1;

  const musicBob = Math.sin(t * 3.5) * 1;

  // Cursor approaches Shop button from below-right
  const cursorMoveStart = 3.0;
  const cursorMoveEnd = 3.8;
  const cursorClickAt = 3.8;

  const shopX = 158;
  const shopY = 372;
  const startX = 168;
  const startY = 405;

  let cursorX = startX;
  let cursorY = startY;
  let cursorVisible = false;

  if (t >= cursorMoveStart - 0.1) {
    cursorVisible = true;
    const mT = Math.max(0, Math.min(1, (t - cursorMoveStart) / (cursorMoveEnd - cursorMoveStart)));
    const mE = ease.inOutCubic(mT);
    cursorX = startX + mE * (shopX - startX);
    cursorY = startY + mE * (shopY - startY);
  }

  const clickT = Math.max(0, t - cursorClickAt);
  const shopScale =
    clickT > 0 && clickT < 0.18
      ? 1 - 0.12 * Math.sin((clickT / 0.18) * Math.PI)
      : clickT >= 0.18 && clickT < 0.5
        ? 1 + 0.08 * Math.sin(((clickT - 0.18) / 0.32) * Math.PI)
        : 1;
  const showRipple = clickT > 0 && clickT < 0.8;
  const rippleSize = 6 + clickT * 50;
  const rippleOpacity = Math.max(0, 0.5 - clickT * 0.7);

  const cursorScale = clickT > 0 && clickT < 0.18 ? 0.85 : 1;

  // Step pill entrance
  const pillEntranceT = Math.max(0, Math.min(1, t / 0.3));
  const pillOpacity = ease.outCubic(pillEntranceT);
  const pillScale = 0.92 + 0.08 * ease.outBack(pillEntranceT);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-3">
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium shadow-md"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          opacity: pillOpacity * intro,
          transform: `scale(${pillScale})`,
          transformOrigin: "center",
        }}
      >
        <Megaphone className="h-3 w-3" strokeWidth={2.2} />
        Step 2 · Promote
      </div>

      <div
        className="relative"
        style={{
          width: PHONE_WIDTH,
          height: PHONE_HEIGHT,
          opacity: intro,
          transform: `translateY(${20 - 20 * intro}px)`,
        }}
      >
        <div className="absolute inset-0 rounded-[28px] bg-foreground" style={{ padding: 6 }}>
          <div className="relative h-full w-full rounded-[22px] overflow-hidden bg-foreground">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-12 rounded-full bg-foreground z-30" />

            <div className="absolute inset-0 bg-foreground">
              <AbstractCreatorFigure />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 18%, transparent 55%, rgba(0,0,0,0.55) 100%)",
                }}
              />
            </div>

            {/* Top bar — Emma K */}
            <div className="absolute top-5 left-2 right-2 flex items-center gap-1 z-20">
              <div className="h-4 w-4 rounded-full overflow-hidden ring-1 ring-white/90">
                <AbstractAvatar />
              </div>
              <div className="text-white text-[8px] font-medium" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                Emma K
              </div>
              <div className="text-white/90 text-[6px] border border-white/70 rounded px-1 py-px font-medium">
                Follow
              </div>
            </div>

            {/* Right rail — engagement */}
            <div
              className="absolute right-1.5 bottom-24 flex flex-col gap-2 items-center z-20"
              style={{ opacity: engOpacity }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  style={{ transform: `scale(${heartScale})` }}
                >
                  <Heart className="h-3.5 w-3.5" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" />
                </div>
                <div
                  className="text-white text-[7px] font-medium tabular-nums"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  {likeCount.toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
                <div className="text-white text-[7px] font-medium" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                  248
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Send className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
                <div className="text-white text-[7px] font-medium" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                  Share
                </div>
              </div>
            </div>

            {/* Caption */}
            <div className="absolute left-2 right-10 bottom-16 z-20">
              <div
                className="text-white text-[9px] font-medium leading-snug"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
              >
                {captionText}
                {captionTyping && <span className="inline-block w-0.5 h-2.5 bg-white align-middle ml-px" />}
              </div>
              <div className="mt-1 flex items-center gap-0.5" style={{ transform: `translateY(${musicBob}px)` }}>
                <Music2 className="h-2 w-2 text-white/90" strokeWidth={2.2} />
                <div className="text-white/90 text-[7px]" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  original sound · Emma K
                </div>
              </div>
            </div>

            {/* Product tag */}
            <div className="absolute left-2 right-2 bottom-3 z-20">
              <div
                className="bg-background rounded-lg p-1.5 flex items-center gap-1.5 shadow-xl"
                style={{
                  boxShadow: "0 0 0 1.5px hsl(var(--primary) / 0.5), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "hsl(15 60% 94%)" }}
                >
                  <SkincareTagIllustration />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-medium text-foreground leading-tight truncate">Skincare set</div>
                  <div className="text-[7px] text-muted-foreground mt-px">R 1,200</div>
                </div>
                <div className="relative shrink-0">
                  {showRipple && (
                    <span
                      className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
                      style={{
                        width: rippleSize,
                        height: rippleSize,
                        transform: "translate(-50%, -50%)",
                        background: "hsl(var(--primary))",
                        opacity: rippleOpacity,
                      }}
                    />
                  )}
                  <div
                    className="relative rounded-full bg-foreground text-background text-[8px] font-medium px-2 py-1"
                    style={{
                      transform: `scale(${shopScale})`,
                      transition: "transform 80ms ease-out",
                    }}
                  >
                    Shop
                  </div>
                </div>
              </div>
            </div>

            {cursorVisible && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                className="absolute pointer-events-none z-30"
                style={{
                  left: cursorX,
                  top: cursorY,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                  transform: `scale(${cursorScale})`,
                  transition: "transform 80ms ease-out",
                }}
              >
                <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill="white" stroke="black" strokeWidth="1" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5" style={{ opacity: intro * 0.7 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-0.5 w-5 rounded-full bg-foreground/15" />
        ))}
      </div>
    </div>
  );
}
