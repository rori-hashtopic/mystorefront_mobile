import { Check, Loader2, MessageCircle, ShoppingBag, Store } from "lucide-react";
import { ease } from "../utils";

/**
 * Scene 2 — The mechanic in three states (Creator, Shopper, Brand).
 *
 * In the walkthrough video, the Shopper state is currently SKIPPED:
 *   - Scene 2a renders the Creator state (t=0 to 6).
 *   - Scene 2b renders the Brand state, resumed via phaseOffset=12600 in
 *     WalkthroughPlayer.
 *
 * Anti-flash mechanisms protect both resume points:
 *   1. WalkthroughPlayer clamps phaseMs to the offset during the
 *      upcoming-fade window, so t stays at the offset throughout the
 *      cross-fade from the previous scene.
 *   2. Within this file, both opacity2 (Shopper, used historically) and
 *      opacity3 (Brand, used now) have warm-up ramps from 0 to 1 over
 *      0.4s starting at their respective STATE_START times. The Shopper
 *      and Brand step pills' labelStartTime values are similarly aligned
 *      to STATE2_START / STATE3_START so the pills are invisible during
 *      the WalkthroughPlayer cross-fade and fade in once the resumed
 *      scene is active. Without these, the next state's content would
 *      flash through the player's cross-fade from Scene 4 Promote.
 */

const PHONE_WIDTH = 200;
const PHONE_HEIGHT = 400;

// Abstract avatar — matches the dress-wearing figure in Scene4Promote
const AbstractAvatar = () => (
  <img
    src="/creators/lerato-tiktok.png"
    alt="Emma"
    className="h-full w-full object-cover"
    style={{ objectPosition: "center 28%" }}
    draggable={false}
  />
);

// ── Stylized SVG product illustrations ──

const ShirtSvg = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    <path
      d="M22 30 L30 22 Q40 28 50 22 L58 30 L62 38 L56 40 L56 64 L24 64 L24 40 L18 38 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.04)"
    />
    <path
      d="M34 24 Q40 28 46 24"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const SkincareSvg = () => (
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

const SneakerSvg = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    <path
      d="M10 56 Q10 52 14 51 L66 49 Q72 49 72 53 L72 56 Q72 60 68 60 L14 60 Q10 60 10 56 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.08)"
    />
    <path
      d="M14 51 L14 38 Q14 32 22 30 L36 26 Q40 25 44 27 L52 32 L60 36 Q66 38 66 44 L66 49"
      stroke="hsl(var(--foreground) / 0.75)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.04)"
    />
    <path
      d="M30 30 L40 22 L50 30"
      stroke="hsl(var(--foreground) / 0.6)"
      strokeWidth="1.2"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.02)"
    />
    <line x1="34" y1="32" x2="38" y2="34" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" strokeLinecap="round" />
    <line x1="38" y1="32" x2="34" y2="34" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" strokeLinecap="round" />
    <line x1="42" y1="34" x2="46" y2="36" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" strokeLinecap="round" />
    <line x1="46" y1="34" x2="42" y2="36" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" strokeLinecap="round" />
    <line x1="14" y1="51" x2="66" y2="49" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="0.8" />
    <line x1="16" y1="38" x2="16" y2="50" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="0.8" />
  </svg>
);

const HandbagSvg = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    <path
      d="M30 28 Q30 18 40 18 Q50 18 50 28"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M22 28 L58 28 L62 64 L18 64 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.06)"
    />
    <rect
      x="36"
      y="42"
      width="8"
      height="6"
      rx="1"
      stroke="hsl(var(--foreground) / 0.6)"
      strokeWidth="1"
      fill="hsl(var(--foreground) / 0.08)"
    />
  </svg>
);

const PRODUCTS = [
  { name: "Linen shirt", price: "R 850", bg: "hsl(35 30% 92%)", Svg: ShirtSvg },
  { name: "Skincare set", price: "R 1,200", bg: "hsl(15 60% 94%)", Svg: SkincareSvg },
  { name: "Sneakers", price: "R 1,950", bg: "hsl(220 15% 92%)", Svg: SneakerSvg },
  { name: "Handbag", price: "R 2,400", bg: "hsl(25 35% 88%)", Svg: HandbagSvg },
];

// ── State 1 — Creator pastes URL → affiliate link → product slides in ──
const CreatorAddProductScreen = ({ phaseS }: { phaseS: number }) => {
  const urlVisible = phaseS > 0.4;
  const urlEntranceT = Math.max(0, Math.min(1, (phaseS - 0.4) / 0.4));
  const urlOpacity = ease.outCubic(urlEntranceT);
  const urlOffset = (1 - urlEntranceT) * -8;

  const isLoading = phaseS > 0.8 && phaseS < 1.4;

  const linkReady = phaseS > 1.4;
  const linkT = Math.max(0, Math.min(1, (phaseS - 1.4) / 0.6));
  const linkOpacity = ease.outCubic(linkT);
  const linkOffset = (1 - linkT) * 6;

  const slideT = Math.max(0, Math.min(1, (phaseS - 2.0) / 0.8));
  const slideE = ease.outCubic(slideT);
  const shiftPct = slideE * 100;
  const newProductOpacity = slideE;

  return (
    <>
      <div className="pt-6 px-3 flex items-center gap-2">
        <div className="h-7 w-7 rounded-full overflow-hidden">
          <AbstractAvatar />
        </div>
        <div>
          <div className="text-[10px] font-medium leading-tight">Emma K</div>
          <div className="text-[7px] uppercase tracking-[0.16em] text-muted-foreground">my storefront</div>
        </div>
      </div>
      <div className="mx-3 my-1.5 h-px bg-foreground/10" />

      <div className="px-3 mt-1">
        <div className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Add product link</div>
        <div className="flex items-center gap-1 px-1.5 py-1 bg-foreground/5 rounded border border-foreground/10 h-5 overflow-hidden">
          <div className="text-[7px] font-mono text-foreground/30 shrink-0">https://</div>
          {urlVisible ? (
            <div
              className="text-[7px] font-mono text-foreground truncate"
              style={{ opacity: urlOpacity, transform: `translateX(${urlOffset}px)` }}
            >
              yourbrand.co.za/products/skincare-set
            </div>
          ) : (
            <div className="text-[7px] font-mono text-foreground/30">paste link...</div>
          )}
          {isLoading && <Loader2 className="h-2 w-2 text-foreground/60 animate-spin shrink-0 ml-auto" />}
        </div>

        {linkReady && (
          <div
            className="mt-1.5 flex items-center gap-1 p-1 rounded bg-primary/10 border border-primary/20"
            style={{ opacity: linkOpacity, transform: `translateY(${linkOffset}px)` }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: "hsl(15 60% 94%)" }}
            >
              <SkincareSvg />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[7px] font-medium text-foreground leading-tight">Skincare set</div>
              <div className="text-[6px] text-muted-foreground mt-px">Affiliate link · 10% commission</div>
            </div>
            <Check className="h-2.5 w-2.5 text-primary shrink-0" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <div className="px-3 mt-2.5">
        <div className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Your products</div>
        <div className="relative" style={{ height: 56 }}>
          <div
            className="absolute top-0 rounded border border-foreground/10 overflow-hidden bg-card"
            style={{
              left: 0,
              width: "calc(33.333% - 4px)",
              height: 56,
              opacity: newProductOpacity,
              transform: `translateX(${(1 - slideE) * -10}px) scale(${0.9 + 0.1 * slideE})`,
              transformOrigin: "left center",
            }}
          >
            <div className="aspect-square w-full" style={{ background: "hsl(15 60% 94%)" }}>
              <SkincareSvg />
            </div>
          </div>

          <div
            className="absolute top-0 rounded border border-foreground/10 overflow-hidden bg-card"
            style={{ left: 0, width: "calc(33.333% - 4px)", height: 56, transform: `translateX(${shiftPct}%)` }}
          >
            <div className="aspect-square w-full" style={{ background: "hsl(35 30% 92%)" }}>
              <ShirtSvg />
            </div>
          </div>

          <div
            className="absolute top-0 rounded border border-foreground/10 overflow-hidden bg-card"
            style={{
              left: "calc(33.333% + 2px)",
              width: "calc(33.333% - 4px)",
              height: 56,
              transform: `translateX(${shiftPct}%)`,
            }}
          >
            <div className="aspect-square w-full" style={{ background: "hsl(220 15% 92%)" }}>
              <SneakerSvg />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── State 2 — Skincare pre-highlighted, shopper taps Buy ──
const ShopperStorefrontScreen = ({ phaseS }: { phaseS: number }) => {
  const buyX = 100;
  const buyY = 340;
  const cursorStartX = 130;
  const cursorStartY = 365;

  // Cursor approach: 0.4–1.2s
  const cursorT = Math.max(0, Math.min(1, (phaseS - 0.4) / 0.8));
  const cursorE = ease.inOutCubic(cursorT);
  const cursorX = cursorStartX + cursorE * (buyX - cursorStartX);
  const cursorY = cursorStartY + cursorE * (buyY - cursorStartY);

  const highlightOpacity = Math.min(1, phaseS / 0.15);

  const clickAt = 1.2;
  const clickT = Math.max(0, phaseS - clickAt);
  const buyScale =
    clickT > 0 && clickT < 0.18
      ? 1 - 0.1 * Math.sin((clickT / 0.18) * Math.PI)
      : clickT >= 0.18 && clickT < 0.5
        ? 1 + 0.08 * Math.sin(((clickT - 0.18) / 0.32) * Math.PI)
        : 1;

  const cursorScale = clickT > 0 && clickT < 0.18 ? 0.85 : 1;

  const showRipple = clickT > 0 && clickT < 0.8;
  const rippleSize = 8 + clickT * 60;
  const rippleOpacity = Math.max(0, 0.5 - clickT * 0.7);

  const cursorVisible = phaseS > 0.4;

  return (
    <>
      <div className="pt-6 px-3 flex items-center gap-2">
        <div className="h-7 w-7 rounded-full overflow-hidden">
          <AbstractAvatar />
        </div>
        <div>
          <div className="text-[10px] font-medium leading-tight">Emma K</div>
          <div className="text-[7px] uppercase tracking-[0.16em] text-muted-foreground">my storefront</div>
        </div>
      </div>
      <div className="mx-3 my-2 h-px bg-foreground/10" />

      <div className="px-3 grid grid-cols-2 gap-1.5">
        {PRODUCTS.map((p, idx) => {
          const isTarget = idx === 1;
          return (
            <div
              key={p.name}
              className="rounded-lg border border-foreground/10 overflow-hidden bg-card"
              style={{
                boxShadow:
                  isTarget && highlightOpacity > 0
                    ? `0 0 0 1.5px hsl(var(--primary) / ${highlightOpacity})`
                    : undefined,
                transform: isTarget && highlightOpacity > 0 ? `scale(${1 + 0.03 * highlightOpacity})` : undefined,
                transition: "box-shadow 200ms ease-out",
              }}
            >
              <div className="aspect-square w-full" style={{ background: p.bg }}>
                <p.Svg />
              </div>
              <div className="p-1">
                <div className="text-[6px] font-medium leading-tight truncate">{p.name}</div>
                <div className="text-[5px] text-muted-foreground mt-px">{p.price}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute left-3 right-3 bottom-3 flex justify-center">
        <div className="relative">
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
            className="relative rounded-full bg-foreground text-background text-[9px] font-medium px-4 py-1.5"
            style={{ transform: `scale(${buyScale})`, transition: "transform 80ms ease-out" }}
          >
            Buy now
          </div>
        </div>
      </div>

      {cursorVisible && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          className="absolute pointer-events-none"
          style={{
            left: cursorX,
            top: cursorY,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
            transform: `scale(${cursorScale})`,
            transition: "transform 80ms ease-out",
          }}
        >
          <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill="white" stroke="black" strokeWidth="1" />
        </svg>
      )}
    </>
  );
};

// ── State 3 — Brand commission view (casual celebration card) ──
const CommissionScreen = ({ phaseS }: { phaseS: number }) => {
  const headerT = Math.max(0, Math.min(1, phaseS / 0.3));
  const headerOpacity = ease.outCubic(headerT);

  const cardT = Math.max(0, Math.min(1, (phaseS - 0.3) / 0.6));
  const cardOpacity = ease.outCubic(cardT);
  const cardScale = 0.94 + 0.06 * ease.outBack(cardT);
  const cardOffset = (1 - cardT) * 16;

  const popT = Math.max(0, Math.min(1, (phaseS - 0.5) / 0.4));
  const popScale = 0.7 + 0.3 * ease.outBack(popT);
  const popOpacity = ease.outCubic(popT);

  const cursorVisible = phaseS > 1.0;
  const cursorT = Math.max(0, Math.min(1, (phaseS - 1.0) / 1.5));
  const cursorE = ease.inOutCubic(cursorT);

  const cursorStartX = 160;
  const cursorStartY = 60;
  const cursorEndX = 95;
  const cursorEndY = 325;
  const cursorX = cursorStartX + cursorE * (cursorEndX - cursorStartX);
  const cursorY = cursorStartY + cursorE * (cursorEndY - cursorStartY);

  const clickT = Math.max(0, (phaseS - 2.5) / 0.3);
  const buttonScale = clickT > 0 && clickT < 1 ? 1 + 0.1 * Math.sin(clickT * Math.PI) : 1;

  return (
    <>
      <div className="pt-7 px-3 text-center" style={{ opacity: headerOpacity }}>
        <div className="font-display text-[14px] font-medium leading-tight">New sale ✨</div>
      </div>

      <div
        className="mx-3 mt-3 rounded-2xl border border-primary/25 bg-primary/8 p-3"
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardOffset}px) scale(${cardScale})`,
          transformOrigin: "center top",
          boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.2)",
        }}
      >
        <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-primary/15">
          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
            <AbstractAvatar />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-medium leading-tight">Emma K</div>
            <div className="text-[7px] text-muted-foreground mt-px">sold your Skincare set</div>
          </div>
        </div>

        <div className="text-center py-1 relative">
          <div className="text-[7px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Her commission</div>
          <div className="relative inline-block">
            <div
              className="font-display text-[30px] font-medium text-primary leading-none"
              style={{
                opacity: popOpacity,
                transform: `scale(${popScale})`,
                transformOrigin: "center center",
              }}
            >
              R 120
            </div>
            <span
              className="absolute text-[13px]"
              style={{
                top: -8,
                right: -16,
                opacity: popOpacity * 0.95,
                transform: `scale(${popScale}) rotate(${15 * popScale}deg)`,
                transformOrigin: "center",
              }}
            >
              ✨
            </span>
          </div>
        </div>

        <div className="text-center mt-3">
          <div className="text-[11px] font-medium text-foreground leading-tight">R 1,200 sale</div>
          <div className="text-[7px] text-muted-foreground mt-px tracking-wide">10% commission rate</div>
        </div>
      </div>

      <div className="absolute left-3 right-3 bottom-7 flex justify-center">
        <div
          className="rounded-full bg-foreground text-background text-[9px] font-medium px-5 py-2"
          style={{ transform: `scale(${buttonScale})` }}
        >
          Pay Creator
        </div>
      </div>

      <div className="absolute left-3 right-3 bottom-2.5 text-center">
        <div className="text-[6px] text-muted-foreground tracking-wide">Only paid on confirmed sales</div>
      </div>

      {cursorVisible && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          className="absolute pointer-events-none"
          style={{
            left: cursorX,
            top: cursorY,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
          }}
        >
          <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill="white" stroke="black" strokeWidth="1" />
        </svg>
      )}
    </>
  );
};

// ── Step pill labels ──

type Label = {
  text: string;
  Icon: React.ComponentType<any>;
  bg: string;
  fg: string;
};

const LABEL_CREATOR: Label = {
  text: "Step 1 · Feature",
  Icon: MessageCircle,
  bg: "hsl(var(--primary))",
  fg: "hsl(var(--primary-foreground))",
};
const LABEL_SHOPPER: Label = {
  text: "Step 3 · Buy",
  Icon: ShoppingBag,
  bg: "hsl(95 75% 35%)",
  fg: "#FFFFFF",
};
const LABEL_BRAND: Label = {
  text: "Step 3 · Pay",
  Icon: Store,
  bg: "hsl(var(--foreground))",
  fg: "hsl(var(--background))",
};

// ── Main component ──

export default function Scene2Flow({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const intro = ease.outCubic(Math.min(1, t / 0.5));

  const STATE1_END = 6.0;
  const STATE2_START = 6.4;
  const STATE2_END = 12.2;
  const STATE3_START = 12.6;
  const STATE3_END = 18.6;

  let opacity1 = 0;
  let opacity2 = 0;
  let opacity3 = 0;

  if (t < STATE1_END) {
    opacity1 = 1;
  } else if (t < STATE2_START) {
    const fadeT = (t - STATE1_END) / (STATE2_START - STATE1_END);
    opacity1 = 1 - fadeT;
    opacity2 = fadeT;
  } else if (t < STATE2_START + 0.4) {
    // Warm-up window for Scene 2b (when WalkthroughPlayer resumes via
    // phaseOffset=6400): ramp opacity2 from 0 to 1 over 0.4s. This prevents
    // the Shopper grid from flashing through during the player's 400ms
    // cross-fade from Scene 4 Promote.
    const warmupT = (t - STATE2_START) / 0.4;
    opacity2 = ease.outCubic(warmupT);
  } else if (t < STATE2_END) {
    opacity2 = 1;
  } else if (t < STATE3_START) {
    const fadeT = (t - STATE2_END) / (STATE3_START - STATE2_END);
    opacity2 = 1 - fadeT;
    opacity3 = fadeT;
  } else if (t < STATE3_START + 0.4) {
    // Warm-up window for Scene 2b (when WalkthroughPlayer resumes via
    // phaseOffset=12600 to start directly at the Brand state): ramp
    // opacity3 from 0 to 1 over 0.4s. This prevents the commission card
    // from flashing through during the player's 400ms cross-fade from
    // Scene 4 Promote.
    const warmupT = (t - STATE3_START) / 0.4;
    opacity3 = ease.outCubic(warmupT);
  } else {
    opacity3 = 1;
  }

  const state1S = Math.max(0, t);
  const state2S = Math.max(0, t - STATE2_START);
  const state3S = Math.max(0, t - STATE3_START);

  const dot1Fill = Math.min(1, state1S / STATE1_END);
  const dot2Fill = t < STATE2_START ? 0 : Math.min(1, state2S / (STATE2_END - STATE2_START));
  const dot3Fill = t < STATE3_START ? 0 : Math.min(1, state3S / (STATE3_END - STATE3_START));

  let activeLabel: Label;
  let labelKey: string;
  let labelStartTime: number;

  if (t < STATE2_START - 0.2) {
    activeLabel = LABEL_CREATOR;
    labelKey = "creator";
    labelStartTime = 0;
  } else if (t < STATE3_START - 0.2) {
    activeLabel = LABEL_SHOPPER;
    labelKey = "shopper";
    // labelStartTime starts AT STATE2_START so the pill is invisible during
    // the WalkthroughPlayer cross-fade (when t is clamped to 6.4) and fades
    // in over the first 0.3s of Scene 2b being active.
    labelStartTime = STATE2_START;
  } else {
    activeLabel = LABEL_BRAND;
    labelKey = "brand";
    // labelStartTime starts AT STATE3_START so the pill is invisible during
    // the WalkthroughPlayer cross-fade (when t is clamped to 12.6) and fades
    // in over the first 0.3s of Scene 2b being active.
    labelStartTime = STATE3_START;
  }

  const labelEntranceT = Math.max(0, Math.min(1, (t - labelStartTime) / 0.3));
  const labelOpacity = ease.outCubic(labelEntranceT);
  const labelScale = 0.92 + 0.08 * ease.outBack(labelEntranceT);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-3">
      <div
        key={labelKey}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium shadow-md"
        style={{
          background: activeLabel.bg,
          color: activeLabel.fg,
          opacity: labelOpacity * intro,
          transform: `scale(${labelScale})`,
          transformOrigin: "center",
        }}
      >
        <activeLabel.Icon className="h-3 w-3" strokeWidth={2.2} />
        {activeLabel.text}
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
          <div
            className="relative h-full w-full rounded-[22px] overflow-hidden"
            style={{ background: "hsl(40 25% 96%)" }}
          >
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-12 rounded-full bg-foreground/90" />

            <div className="absolute inset-0" style={{ opacity: opacity1, pointerEvents: "none" }}>
              <CreatorAddProductScreen phaseS={state1S} />
            </div>
            <div className="absolute inset-0" style={{ opacity: opacity2, pointerEvents: "none" }}>
              <ShopperStorefrontScreen phaseS={state2S} />
            </div>
            <div className="absolute inset-0" style={{ opacity: opacity3, pointerEvents: "none" }}>
              <CommissionScreen phaseS={state3S} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5" style={{ opacity: intro * 0.7 }}>
        {[dot1Fill, dot2Fill, dot3Fill].map((fill, i) => (
          <div key={i} className="h-0.5 w-5 rounded-full bg-foreground/15 overflow-hidden">
            <div className="h-full bg-foreground" style={{ width: `${fill * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
