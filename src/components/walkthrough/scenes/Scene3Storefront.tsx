import { ease } from "../utils";

// Stylized SVG illustrations for each product card
const ShirtIllustration = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    {/* Hanger hook */}
    <path d="M40 14 Q40 10 36 10" stroke="hsl(var(--foreground) / 0.6)" strokeWidth="1.5" strokeLinecap="round" />
    {/* Shirt outline */}
    <path
      d="M22 30 L30 22 Q40 28 50 22 L58 30 L62 38 L56 40 L56 64 L24 64 L24 40 L18 38 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.04)"
    />
    {/* Collar */}
    <path
      d="M34 24 Q40 28 46 24"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const SkincareIllustration = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    {/* Bottle cap */}
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
    {/* Bottle neck */}
    <rect
      x="34"
      y="20"
      width="12"
      height="6"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="hsl(var(--foreground) / 0.04)"
    />
    {/* Bottle body — pump-style */}
    <path
      d="M28 26 Q26 28 26 32 L26 64 Q26 68 30 68 L50 68 Q54 68 54 64 L54 32 Q54 28 52 26 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="hsl(var(--foreground) / 0.04)"
    />
    {/* Label band */}
    <line x1="28" y1="44" x2="52" y2="44" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" />
    <line x1="28" y1="50" x2="52" y2="50" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" />
  </svg>
);

const SneakerIllustration = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    {/* Sneaker side profile */}
    <path
      d="M14 52 Q14 44 22 42 Q28 38 34 36 L48 28 Q56 26 60 32 L64 38 Q68 42 68 48 Q68 54 64 56 L18 56 Q14 56 14 52 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.04)"
    />
    {/* Sole */}
    <path d="M14 52 L68 52" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="1.5" strokeLinecap="round" />
    {/* Laces */}
    <line x1="38" y1="38" x2="40" y2="42" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" />
    <line x1="44" y1="36" x2="46" y2="40" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" />
    <line x1="50" y1="34" x2="52" y2="38" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" />
    {/* Toe stitch */}
    <path d="M22 46 Q26 42 30 42" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" fill="none" />
  </svg>
);

const HandbagIllustration = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
    {/* Handle */}
    <path
      d="M30 28 Q30 18 40 18 Q50 18 50 28"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Bag body */}
    <path
      d="M22 28 L58 28 L62 64 L18 64 Z"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="hsl(var(--foreground) / 0.06)"
    />
    {/* Clasp */}
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

const products = [
  { name: "Linen shirt", price: "R 850", bg: "hsl(35 30% 92%)", Illustration: ShirtIllustration },
  { name: "Skincare set", price: "R 1,200", bg: "hsl(15 60% 94%)", Illustration: SkincareIllustration },
  { name: "Sneakers", price: "R 1,950", bg: "hsl(220 15% 92%)", Illustration: SneakerIllustration },
  { name: "Handbag", price: "R 2,400", bg: "hsl(25 35% 88%)", Illustration: HandbagIllustration },
];

export default function Scene3Storefront({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const intro = ease.outCubic(Math.min(1, t / 0.8));

  // ── Cursor choreography ──
  // Phase A: cursor moves to skincare card (1.5–2.5s)
  // Phase B: card highlights briefly (2.5–3.0s), cursor lingers
  // Phase C: cursor moves down to buy button (3.0–4.0s)
  // Phase D: buy button pulses + confetti (4.0–4.6s)

  const cursorAStart = 1.5;
  const cursorAEnd = 2.5;
  const cursorBStart = 3.0;
  const cursorBEnd = 4.0;
  const buyTriggerAt = 4.0;

  const skincareX = 175;
  const skincareY = 175;
  const buyX = 130;
  const buyY = 470;

  let cursorX = 230;
  let cursorY = 480;
  let cursorVisible = false;

  if (t >= cursorAStart - 0.2 && t < cursorBStart) {
    cursorVisible = true;
    const aT = Math.max(0, Math.min(1, (t - cursorAStart) / (cursorAEnd - cursorAStart)));
    const aE = ease.inOutCubic(aT);
    cursorX = 230 - aE * (230 - skincareX);
    cursorY = 480 - aE * (480 - skincareY);
  } else if (t >= cursorBStart && t < cursorBEnd + 0.4) {
    cursorVisible = true;
    const bT = Math.max(0, Math.min(1, (t - cursorBStart) / (cursorBEnd - cursorBStart)));
    const bE = ease.inOutCubic(bT);
    cursorX = skincareX + bE * (buyX - skincareX);
    cursorY = skincareY + bE * (buyY - skincareY);
  } else if (t >= cursorBEnd + 0.4) {
    cursorVisible = true;
    cursorX = buyX;
    cursorY = buyY;
  }

  const tappedAt = 2.5;
  const cardActive = t >= tappedAt && t < cursorBStart + 0.5;
  const cardScale = cardActive ? 1 + 0.04 * Math.exp(-(t - tappedAt) * 4) : 1;
  let highlightOpacity = 0;
  if (t >= tappedAt && t < cursorBStart) {
    highlightOpacity = Math.min(1, (t - tappedAt) / 0.15);
  } else if (t >= cursorBStart && t < cursorBStart + 0.5) {
    highlightOpacity = Math.max(0, 1 - (t - cursorBStart) / 0.5);
  }

  const buyPulse = Math.max(0, t - buyTriggerAt);
  const buyScale = buyPulse > 0 && buyPulse < 0.6 ? 1 + 0.1 * Math.sin((buyPulse / 0.6) * Math.PI) : 1;
  const showConfetti = buyPulse > 0.05 && buyPulse < 1.4;

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4">
      {/* Phone shell */}
      <div
        className="relative"
        style={{
          width: 260,
          height: 520,
          opacity: intro,
          transform: `translateY(${20 - 20 * intro}px)`,
        }}
      >
        <div className="absolute inset-0 rounded-[36px] bg-foreground" style={{ padding: 8 }}>
          <div className="relative h-full w-full rounded-[28px] bg-background overflow-hidden">
            {/* notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-20 rounded-full bg-foreground/90" />
            {/* header */}
            <div className="pt-8 px-4 flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-full bg-cover bg-center bg-primary/20 flex items-center justify-center text-primary font-medium text-sm overflow-hidden"
                style={{
                  backgroundImage: "url('/creators/roxi.jpg')",
                }}
              >
                {/* Fallback initials shown if image fails to load. The image
                    sits on top via background-image so when present the text
                    is hidden behind it. */}
                <span className="opacity-0">R</span>
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">@roxi</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">my storefront</div>
              </div>
            </div>
            <div className="mx-4 my-3 h-px bg-foreground/10" />

            {/* product grid */}
            <div className="px-4 grid grid-cols-2 gap-2">
              {products.map((p, idx) => {
                const isTarget = idx === 1; // skincare set
                const Illustration = p.Illustration;
                return (
                  <div
                    key={p.name}
                    className="rounded-xl border border-foreground/10 overflow-hidden bg-card"
                    style={{
                      transform: isTarget ? `scale(${cardScale})` : undefined,
                      boxShadow:
                        isTarget && highlightOpacity > 0
                          ? `0 0 0 2px hsl(var(--primary) / ${highlightOpacity})`
                          : undefined,
                      transition: "box-shadow 200ms ease-out",
                    }}
                  >
                    <div className="h-16 w-full flex items-center justify-center p-2" style={{ background: p.bg }}>
                      <Illustration />
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-medium leading-tight truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Buy now */}
            <div className="absolute left-4 right-4 bottom-5 flex justify-center">
              <div
                className="relative rounded-full bg-foreground text-background text-xs font-medium px-6 py-2.5"
                style={{ transform: `scale(${buyScale})` }}
              >
                Buy now
                {showConfetti && (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const angle = (i / 6) * Math.PI * 2;
                      const r = 10 + buyPulse * 40;
                      const op = Math.max(0, 1 - buyPulse / 1.4);
                      return (
                        <span
                          key={i}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
                          style={{
                            background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(40 80% 60%)",
                            transform: `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`,
                            opacity: op,
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* cursor */}
            {cursorVisible && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                className="absolute pointer-events-none"
                style={{
                  left: cursorX,
                  top: cursorY,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                  transition: "transform 100ms linear",
                }}
              >
                <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill="white" stroke="black" strokeWidth="1" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
