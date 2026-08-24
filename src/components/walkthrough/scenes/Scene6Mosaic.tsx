import { Search, MessageCircle, Gift, AtSign, Ticket } from "lucide-react";
import { ease } from "../utils";

const tiles = [
  { Icon: Search, name: "Creator discovery", desc: "Find them" },
  { Icon: MessageCircle, name: "Messaging", desc: "Talk to them" },
  { Icon: Gift, name: "Gifting", desc: "Send products" },
  { Icon: AtSign, name: "Mentions", desc: "Tag them" },
  { Icon: Ticket, name: "Discount codes", desc: "Reward them" },
];

export default function Scene6Mosaic({ phaseMs }: { phaseMs: number }) {
  const t = phaseMs / 1000;
  const headT = ease.outCubic(Math.min(1, t / 0.6));
  const tilesT = ease.outCubic(Math.min(1, Math.max(0, (t - 0.6) / 0.7)));

  // Pulse walks across tiles starting at t=1.4, every 0.9s
  const pulseStart = 1.4;
  const pulseEvery = 0.9;
  const pulseDur = 0.5;
  const activeIdx = Math.floor((t - pulseStart) / pulseEvery);
  const pulseLocalT = (t - pulseStart) % pulseEvery;
  const pulseAmt =
    activeIdx >= 0 && activeIdx < tiles.length && pulseLocalT < pulseDur
      ? Math.sin((pulseLocalT / pulseDur) * Math.PI)
      : 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8">
      <div style={{ opacity: headT }} className="text-center mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Premium plan</div>
        <div className="font-display text-2xl sm:text-3xl mt-1">When you're ready, there's more.</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full max-w-3xl">
        {tiles.map(({ Icon, name, desc }, i) => {
          const isActive = i === activeIdx;
          const scale = isActive ? 1 + 0.05 * pulseAmt : 1;
          const glow = isActive ? pulseAmt : 0;
          const isLast = i === tiles.length - 1;
          return (
            <div
              key={name}
              className={`border border-foreground/15 bg-card p-4 text-center ${
                isLast ? "col-span-2 sm:col-span-1" : ""
              }`}
              style={{
                opacity: tilesT,
                transform: `scale(${scale}) translateY(${(1 - tilesT) * 8}px)`,
                boxShadow: glow
                  ? `0 0 0 2px hsl(var(--primary) / ${glow * 0.6}), 0 8px 24px -8px hsl(var(--primary) / ${glow * 0.4})`
                  : undefined,
                transition: "box-shadow 100ms linear",
              }}
            >
              <Icon
                className="h-5 w-5 mx-auto mb-2"
                style={{
                  color: glow > 0.2 ? "hsl(var(--primary))" : undefined,
                }}
              />
              <div className="text-xs font-medium">{name}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
