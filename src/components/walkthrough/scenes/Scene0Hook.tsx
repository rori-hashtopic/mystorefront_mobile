import { ease } from "../utils";

/**
 * Scene 0 — Hook scene with vertical-slide sequential reveal.
 *
 * Each question slides up from below into center, holds, then slides up and
 * out. Incoming and outgoing questions are at different vertical positions
 * during the brief overlap, so they never physically stack on the same line.
 *
 * Typography matches captions: Inter (default sans), normal weight, dark
 * foreground (or coral accent), no italic.
 *
 * Timeline (absolute seconds within the scene's 8.5s duration):
 *   0.0 – 1.9:  Q1 (slide-in 0–0.5, hold 0.5–1.5, slide-out 1.5–1.9)
 *   1.7 – 3.5:  Q2 (overlaps only 0.2s with Q1, vertically offset)
 *   3.3 – 5.6:  Q3 ANCHOR (extra hold time)
 *   5.4 – 7.0:  Q4
 *   6.8 – 8.5:  Q5 (final, holds until scene end)
 */

type Question = {
  text: string;
  accent: boolean;
  startS: number; // when slide-in begins
  holdS: number; // duration held fully visible (after 0.5s slide-in)
};

const QUESTIONS: Question[] = [
  {
    text: "Why am I paying creators upfront?",
    accent: false,
    startS: 0.0,
    holdS: 1.0,
  },
  {
    text: "Is creator marketing even working?",
    accent: true,
    startS: 1.7,
    holdS: 1.0,
  },
  {
    text: "What if I could only pay when it works?",
    accent: false,
    startS: 3.3,
    holdS: 1.5, // anchor — extra hold
  },
  {
    text: "How do I find creators that fit?",
    accent: false,
    startS: 5.4,
    holdS: 1.0,
  },
  {
    text: "Where are all my creator sales?",
    accent: true,
    startS: 6.8,
    holdS: 1.5, // last — holds until scene end
  },
];

const SLIDE_IN_S = 0.5;
const SLIDE_OUT_S = 0.4;
const SLIDE_DISTANCE = 40; // px the text travels in/out

export default function Scene0Hook({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;

  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
      <div className="w-full max-w-[720px] relative">
        {QUESTIONS.map((q, i) => {
          const slideInStart = q.startS;
          const fullVisibleStart = q.startS + SLIDE_IN_S;
          const slideOutStart = fullVisibleStart + q.holdS;
          const gone = slideOutStart + SLIDE_OUT_S;

          let opacity = 0;
          let translateY = 0;

          if (t >= slideInStart && t < fullVisibleStart) {
            // Sliding in from below
            const p = (t - slideInStart) / SLIDE_IN_S;
            const e = ease.outCubic(p);
            opacity = e;
            translateY = (1 - e) * SLIDE_DISTANCE; // starts +40 (below), ends 0
          } else if (t >= fullVisibleStart && t < slideOutStart) {
            // Fully visible, centered
            opacity = 1;
            translateY = 0;
          } else if (t >= slideOutStart && t < gone) {
            // Sliding out upward
            const p = (t - slideOutStart) / SLIDE_OUT_S;
            const e = ease.outCubic(p);
            opacity = 1 - e;
            translateY = -e * SLIDE_DISTANCE; // ends -40 (above)
          }

          if (opacity <= 0) return null;

          const color = q.accent ? "hsl(var(--primary))" : "hsl(var(--foreground))";

          return (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                willChange: "transform, opacity",
              }}
            >
              <div className="text-center font-medium leading-snug text-[22px] sm:text-[36px]" style={{ color }}>
                {q.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
