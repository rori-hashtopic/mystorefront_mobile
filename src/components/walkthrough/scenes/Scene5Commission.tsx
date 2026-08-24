import { Check, Clock, Zap, Plug } from "lucide-react";
import { ease } from "../utils";

type Pill = {
  text: string;
  Icon: typeof Check;
};

const pills: Pill[] = [
  { text: "Free to join", Icon: Check },
  { text: "Pay on confirmed sales", Icon: Check },
  { text: "Live in 10 mins", Icon: Zap },
  { text: "E-commerce ready", Icon: Plug },
];

export default function Scene5Commission({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const intro = ease.outCubic(Math.min(1, t / 0.7));

  // Slider thumb springs from 5% to 10% over ~1.6s starting at t=0.6.
  // 5–25% range; final thumb position is (10-5)/(25-5) = 0.25.
  const sliderT = Math.max(0, Math.min(1, (t - 0.6) / 1.6));
  const sliderE = ease.outBack(sliderT);
  const finalRatio = 0.25;
  const ratio = Math.max(0, sliderE * finalRatio);
  const value = 5 + ratio * 20;

  const pillStart = 2.6;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-md border border-foreground/15 bg-card px-5 py-6 sm:px-7 sm:py-7"
        style={{ opacity: intro, transform: `translateY(${14 - 14 * intro}px)` }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
          Your commission rate
        </div>

        {/* Centered value */}
        <div className="text-center mt-3 mb-4">
          <span className="font-display text-5xl sm:text-6xl text-foreground tabular-nums leading-none">
            {Math.round(value)}
          </span>
          <span className="font-display text-2xl sm:text-3xl text-foreground/60 leading-none ml-0.5">%</span>
        </div>

        {/* Slider */}
        <div className="relative h-1.5 bg-foreground/10 rounded-full">
          <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${ratio * 100}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-foreground border-2 border-background shadow"
            style={{ left: `${ratio * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>5%</span>
          <span>25%</span>
        </div>
      </div>

      {/* Trust pills — 2x2 grid on mobile (equal-width cells with content
          centered for a tidy grid), single row on md+ where each pill takes
          its natural content width. */}
      <div className="grid grid-cols-2 gap-2 mt-4 sm:mt-5 w-full max-w-xs md:flex md:flex-row md:items-center md:justify-center md:max-w-md">
        {pills.map((p, i) => {
          const pT = ease.outCubic(Math.min(1, Math.max(0, (t - pillStart - i * 0.15) / 0.4)));
          return (
            <div
              key={p.text}
              className="flex items-center justify-center gap-1 rounded-full border border-foreground/15 bg-card px-3 py-1 text-[10px] whitespace-nowrap w-full md:w-auto"
              style={{ opacity: pT, transform: `translateY(${(1 - pT) * 6}px)` }}
            >
              <p.Icon className="h-3 w-3 text-primary shrink-0" strokeWidth={2.5} />
              {p.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
