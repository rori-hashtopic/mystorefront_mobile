import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Volume2, VolumeX, RotateCcw, Play, Pause, Maximize2, Minimize2, ChevronDown } from "lucide-react";
import Scene0 from "./scenes/Scene0Hook";
import Scene1 from "./scenes/Scene1Opening";
import Scene2 from "./scenes/Scene2Flow";
import Scene4Promote from "./scenes/Scene4Promote";
import Scene4 from "./scenes/Scene4Dashboard";
import Scene5 from "./scenes/Scene5Commission";
import Scene6 from "./scenes/Scene6Mosaic";
import Scene7 from "./scenes/Scene7Close";
import { LofiPlayer } from "./lofiAudio";

type CaptionBeat = {
  text: string;
  startMs: number; // relative to scene start
  endMs: number; // relative to scene start
};

type SceneDef = {
  id: number;
  start: number;
  end: number;
  captions: CaptionBeat[]; // empty array = no captions for this scene
  Component: React.FC<{ phaseMs: number }>;
  /** When set, Component receives phaseMs offset by this many ms.
   *  Used to "resume" Scene2Flow at internal t=6.4s for the Shopper/Brand
   *  states after Scene4Promote plays between the Creator and Shopper beats. */
  phaseOffset?: number;
};

const SCENES: SceneDef[] = [
  {
    id: 0,
    start: 0,
    end: 8500, // 8.5s — Apple-style sequential reveal, one question at a time
    captions: [],
    Component: Scene0,
  },
  {
    id: 1,
    start: 8500,
    end: 11500, // 3s
    captions: [],
    Component: Scene1,
  },
  // Scene 2a — Creator state of Scene2Flow (0–6s of its internal timeline).
  // The Creator caption now ends at "...on their storefronts." because the
  // sentence continues into Scene4Promote.
  {
    id: 2,
    start: 11500,
    end: 17500, // 6s
    captions: [
      {
        text: "Creators feature your products on their storefronts.",
        startMs: 3000,
        endMs: 6000,
      },
    ],
    Component: Scene2,
  },
  // Scene 4 Promote — Step 2 · the TikTok-style creator video.
  // Caption reads as a continuation of Scene 2a's line.
  {
    id: 3,
    start: 17500,
    end: 22500, // 5s
    captions: [
      {
        text: "and promote them to their followers.",
        startMs: 1700,
        endMs: 4800,
      },
    ],
    Component: Scene4Promote,
  },
  // Scene 2b — Brand state of Scene2Flow only (Buy/Shopper state dropped).
  // Resumed via phaseOffset at t=12.6s (start of Brand state). Runs for the
  // 6s duration of the Brand state alone.
  {
    id: 4,
    start: 22500,
    end: 28500, // 6s (12.6–18.6s of Scene2Flow's internal timeline)
    captions: [{ text: "You share commission with the creator for driving the sale.", startMs: 2000, endMs: 6000 }],
    Component: Scene2,
    phaseOffset: 12600,
  },
  {
    id: 5,
    start: 28500,
    end: 39000, // 10.5s — dashboard reveals, then cursor clicks Emma → modal opens with her analytics
    captions: [
      { text: "Every sale, every creator — tracked in real time.", startMs: 2500, endMs: 5300 },
      { text: "See detailed Instagram analytics on every creator.", startMs: 6700, endMs: 10000 },
    ],
    Component: Scene4,
  },
  {
    id: 6,
    start: 39000,
    end: 45800, // 6.8s
    captions: [{ text: "You set the commission rate. We handle the rest.", startMs: 3200, endMs: 6500 }],
    Component: Scene5,
  },
  {
    id: 7,
    start: 45800,
    end: 52800, // 7s — Premium plan mosaic
    captions: [],
    Component: Scene6,
  },
  {
    id: 8,
    start: 52800,
    end: 57800, // 5s
    captions: [],
    Component: Scene7,
  },
];

const TOTAL = 57800;
const FADE = 400;
const CONTROLS_HIDE_DELAY = 2500;
const CAPTION_AREA_HEIGHT = 100;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function WalkthroughPlayer() {
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const playerRef = useRef<HTMLDivElement>(null);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<LofiPlayer | null>(null);
  const playingRef = useRef(true);
  const endedRef = useRef(false);
  const mutedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const wasPlayingBeforeScrubRef = useRef(true);
  const audioStartedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    endedRef.current = ended;
  }, [ended]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    scrubbingRef.current = scrubbing;
  }, [scrubbing]);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new LofiPlayer();

    let cleanupGesture: (() => void) | null = null;

    const tryStart = async () => {
      if (!audioRef.current || audioStartedRef.current || mutedRef.current) return;
      try {
        await audioRef.current.start(0.3);
        audioStartedRef.current = true;
        audioRef.current.setMuted(false, 0.3);
      } catch {
        // Autoplay blocked — wait for first gesture
      }
    };

    // Best-effort autoplay
    void tryStart();

    // Fallback: start on the very first gesture anywhere on the page
    const onGesture = async () => {
      await tryStart();
      if (audioStartedRef.current && cleanupGesture) cleanupGesture();
    };
    window.addEventListener("pointerdown", onGesture, { once: false });
    window.addEventListener("touchstart", onGesture, { once: false });
    window.addEventListener("keydown", onGesture, { once: false });
    cleanupGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("keydown", onGesture);
    };

    return () => {
      cleanupGesture?.();
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, []);

  // Preload images that appear inside scenes — without this, lazy-loaded
  // background-images can briefly show as empty fallbacks when their scene
  // first renders. By the time the user reaches the scene, the browser has
  // these in cache.
  useEffect(() => {
    const imagesToPreload = ["/creators/roxi.jpg"];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const closingFadeTriggeredRef = useRef(false);

  useEffect(() => {
    if (!audioRef.current) return;

    // Closing fade: only the very last 1 second (56800–57800ms).
    // Music plays at full volume through the entire video including the closing
    // scene, then fades quickly during the final hold.
    const inClosingFade = elapsed >= 56800 && elapsed < TOTAL;
    const shouldProduceSound = playing && !muted && !scrubbing && !ended && !inClosingFade;

    const apply = async () => {
      if (shouldProduceSound) {
        // Reset closing fade flag if we've scrubbed back before the fade window
        if (elapsed < 56800) closingFadeTriggeredRef.current = false;

        if (!audioStartedRef.current) {
          await audioRef.current!.start(0.3);
          audioStartedRef.current = true;
        }
        audioRef.current!.setMuted(false, 0.3);
      } else if (
        inClosingFade &&
        audioStartedRef.current &&
        playing &&
        !muted &&
        !scrubbing &&
        !ended &&
        !closingFadeTriggeredRef.current
      ) {
        // Trigger closing fade ONCE — 1s ramp from current volume to silence
        closingFadeTriggeredRef.current = true;
        audioRef.current!.setMuted(true, 1.0);
      } else if (!inClosingFade) {
        if (audioStartedRef.current) {
          audioRef.current!.setMuted(true);
        }
      }
    };
    apply();
  }, [playing, muted, scrubbing, ended, elapsed]);

  useEffect(() => {
    let lastUiUpdate = 0;
    const tick = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (playingRef.current && !endedRef.current && !scrubbingRef.current) {
        elapsedRef.current = Math.min(TOTAL, elapsedRef.current + delta);

        if (elapsedRef.current >= TOTAL) {
          setEnded(true);
          setPlaying(false);
          setElapsed(TOTAL);
        } else if (now - lastUiUpdate > 33) {
          lastUiUpdate = now;
          setElapsed(elapsedRef.current);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    if (playingRef.current && !endedRef.current && !scrubbingRef.current) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, CONTROLS_HIDE_DELAY);
    }
  }, []);

  useEffect(() => {
    if ((!playing && !ended) || scrubbing || ended) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    }
  }, [playing, ended, scrubbing]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (ended) {
      reset();
      return;
    }
    setPlaying((p) => !p);
  };

  const reset = () => {
    elapsedRef.current = 0;
    setElapsed(0);
    setEnded(false);
    setPlaying(true);
  };

  const computeSeekPosition = (clientX: number): number => {
    if (!scrubBarRef.current) return 0;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * TOTAL;
  };

  const seekTo = (newElapsed: number) => {
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);
    if (newElapsed >= TOTAL) {
      setEnded(true);
      setPlaying(false);
    } else if (endedRef.current) {
      setEnded(false);
    }
  };

  const handleScrubStart = (clientX: number) => {
    wasPlayingBeforeScrubRef.current = playingRef.current && !endedRef.current;
    setScrubbing(true);
    seekTo(computeSeekPosition(clientX));
  };

  const handleScrubMove = (clientX: number) => {
    if (!scrubbingRef.current) return;
    seekTo(computeSeekPosition(clientX));
  };

  const handleScrubEnd = () => {
    if (!scrubbingRef.current) return;
    setScrubbing(false);
    if (wasPlayingBeforeScrubRef.current && elapsedRef.current < TOTAL) {
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (!scrubbing) return;
    const onMouseMove = (e: MouseEvent) => handleScrubMove(e.clientX);
    const onMouseUp = () => handleScrubEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleScrubMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleScrubEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  const onScrubBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleScrubStart(e.clientX);
  };

  const onScrubBarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) handleScrubStart(e.touches[0].clientX);
  };

  const toggleMute = () => {
    setMuted((m) => !m);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;

    // iOS Safari on iPhone does not allow requestFullscreen on non-video elements.
    // We detect iOS and use a pseudo-fullscreen approach: position-fixed the player
    // to fill the viewport and lock body scroll. The same minimize button exits.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPad on iOS 13+ reports as Mac, so also check for touch
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const supportsRealFullscreen = !isIOS && typeof playerRef.current.requestFullscreen === "function";

    if (!isFullscreen) {
      if (supportsRealFullscreen) {
        playerRef.current.requestFullscreen?.().catch(() => {
          // Silent failure — fall back to pseudo-fullscreen
          setIsFullscreen(true);
          document.body.style.overflow = "hidden";
        });
      } else {
        // iOS pseudo-fullscreen
        setIsFullscreen(true);
        document.body.style.overflow = "hidden";
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        // Exit pseudo-fullscreen
        setIsFullscreen(false);
        document.body.style.overflow = "";
      }
    }
  };

  // Listen for fullscreen change events (e.g., user pressed ESC to exit)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Restore body scroll on unmount in case we're in pseudo-fullscreen
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const activeIndex = Math.min(
    SCENES.length - 1,
    SCENES.findIndex((s) => elapsed >= s.start && elapsed < s.end) === -1
      ? SCENES.length - 1
      : SCENES.findIndex((s) => elapsed >= s.start && elapsed < s.end),
  );

  const progressPct = (elapsed / TOTAL) * 100;
  const activeScene = SCENES[activeIndex];

  // Find the active caption beat (if any) within the current scene
  const phaseInScene = elapsed - activeScene.start;
  const activeCaption = activeScene.captions.find((c) => phaseInScene >= c.startMs && phaseInScene < c.endMs);

  // Scene 7 (Close, id=8) uses a coral background sweep that fills the scene container.
  // The caption strip below leaves an unwanted cream bar. Match the player background
  // to the coral when Scene 7 is active.
  const isClosingScene = activeScene.id === 8;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        ref={playerRef}
        className={`${isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "relative w-full aspect-[2/3] sm:aspect-video rounded-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]"} border border-foreground/10 overflow-hidden transition-colors duration-500 ${
          isClosingScene ? "bg-primary" : "bg-card"
        }`}
        onMouseMove={showControlsTemporarily}
        onMouseEnter={showControlsTemporarily}
        onMouseLeave={() => {
          if (playingRef.current && !endedRef.current && !scrubbingRef.current) {
            setControlsVisible(false);
          }
        }}
        onTouchStart={showControlsTemporarily}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-controls]")) return;
          togglePlay();
        }}
      >
        <div
          className="absolute left-0 right-0"
          style={{
            top: "20px",
            bottom: `${CAPTION_AREA_HEIGHT}px`,
          }}
        >
          {SCENES.map((scene, i) => {
            const offset = scene.phaseOffset || 0;
            const phase = elapsed - scene.start + offset;
            let opacity = 0;
            if (i === activeIndex) {
              opacity = 1;
              const phaseSinceStart = elapsed - scene.start;
              if (phaseSinceStart < FADE) opacity = phaseSinceStart / FADE;
              const remaining = scene.end - elapsed;
              if (remaining < FADE && i < SCENES.length - 1) opacity = remaining / FADE;
            } else if (i === activeIndex + 1) {
              const upcomingPhase = elapsed - scene.start;
              if (upcomingPhase > -FADE && upcomingPhase < 0) {
                opacity = (upcomingPhase + FADE) / FADE;
              }
            }
            if (opacity <= 0.01 && i !== activeIndex) return null;
            return (
              <div
                key={scene.id}
                className="absolute inset-0"
                style={{ opacity, pointerEvents: i === activeIndex ? "auto" : "none" }}
              >
                {/* Clamp phaseMs to offset to keep resumed scenes (Scene 2b) from
                    replaying their internal cross-fade during the upcoming-fade window. */}
                <scene.Component phaseMs={Math.max(offset, phase)} />
              </div>
            );
          })}
        </div>

        {/* Caption — TikTok-style narration. Captions swap within a scene
            on the same animate-fade-in via a unique key per beat.
            Position is FIXED at bottom: 72px so it never shifts on hover. */}
        <div
          className="absolute left-0 right-0 flex justify-center px-4 z-10 pointer-events-none"
          style={{
            bottom: isFullscreen ? "15vh" : "50px",
          }}
        >
          {activeCaption ? (
            <div
              key={`${activeScene.id}-${activeCaption.startMs}`}
              className="animate-fade-in inline-block max-w-[90%] sm:max-w-[75%] text-center text-[16px] sm:text-[19px] font-medium leading-snug"
              style={{
                color: "hsl(var(--foreground))",
              }}
            >
              {activeCaption.text}
            </div>
          ) : null}
        </div>

        <div
          data-controls
          className="absolute left-0 right-0 bottom-0 z-20 transition-opacity duration-200"
          style={{
            opacity: controlsVisible || ended ? 1 : 0,
            pointerEvents: controlsVisible || ended ? "auto" : "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
            aria-hidden
          />

          <div className="relative flex items-center gap-3 px-4 pb-3 pt-6">
            <button
              onClick={togglePlay}
              aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 flex items-center justify-center transition shrink-0"
            >
              {ended ? (
                <RotateCcw className="h-4 w-4 text-white" />
              ) : playing ? (
                <Pause className="h-4 w-4 text-white fill-white" />
              ) : (
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              <div
                ref={scrubBarRef}
                className="flex-1 h-2 flex items-center cursor-pointer group select-none"
                onMouseDown={onScrubBarMouseDown}
                onTouchStart={onScrubBarTouchStart}
                style={{ touchAction: "none" }}
              >
                <div className="relative w-full h-1 bg-white/20 rounded-full">
                  <div
                    className="absolute left-0 top-0 h-full bg-white rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white transition-opacity ${
                      scrubbing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{ left: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-white/90 font-mono tabular-nums shrink-0">
                {formatTime(elapsed)} / {formatTime(TOTAL)}
              </div>
            </div>

            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 flex items-center justify-center transition shrink-0"
            >
              {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>

            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 flex items-center justify-center transition shrink-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-white" />
              ) : (
                <Maximize2 className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Below-video CTAs — primary (interactive demo) + outlined (pitch deck) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/demo/brand"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm sm:text-base font-medium hover:bg-primary/90 transition-colors"
        >
          See the full interactive demo →
        </Link>
        <a
          href="/MyStorefront-Pitch-Deck.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-primary text-primary px-7 py-3 text-sm sm:text-base font-medium hover:bg-primary/5 transition-colors"
        >
          See pitch deck →
        </a>
      </div>

      {/* FAQ heading + accordion — answers the questions brands have after watching */}
      <div className="mt-16 max-w-xl mx-auto">
        <div className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground text-center mb-6">
          Frequently asked questions
        </div>
        {[
          {
            q: "Is MyStorefront free for brands?",
            a: "Yes — the affiliate tier is always free. You only pay commission on confirmed sales, at the rate you set. There's also an optional Premium plan at R1,500/month that unlocks campaign tools like creator messaging, gifting, guaranteed mentions, and a creator directory. Try Premium free for 14 days when you join.",
          },
          {
            q: "How do creators get paid?",
            a: "MyStorefront invoices you monthly for commission earned on confirmed sales. You pay us, and we pay the creator. You never handle creator payments directly — it all runs through the platform.",
          },
          {
            q: "How do creators join the platform?",
            a: "Creators sign up directly on MyStorefront. We focus on South African creators across fashion, beauty, lifestyle, sport, and home. 250+ SA creators have joined the waitlist since we went public in April 2026.",
          },
          {
            q: "What e-commerce platforms do you integrate with?",
            a: "Shopify, WooCommerce and Wix, via official and approved plugins. Once installed, the plugin tracks every click and sale that comes from a creator's affiliate link automatically.",
          },
          {
            q: "What if a sale gets refunded or returned?",
            a: "Commission is only invoiced on confirmed sales. If an order is refunded or returned before commission is invoiced, no commission is owed. You only ever pay on results that stick.",
          },
          {
            q: "What does the Premium plan unlock?",
            a: "A creator directory you can browse by niche, audience size, and platform. In-platform messaging to brief creators directly. Discount codes for creators to share at checkout. Gifting campaigns with delivery and post tracking. Guaranteed mentions where you approve content before it goes live. And a full analytics dashboard showing clicks, orders, revenue, and commission per creator. Check out the full interactive demo above.",
          },
          {
            q: "Why South African creators specifically?",
            a: "Creator affiliate platforms have been thriving in the US and UK for years. South African creators were putting in the same effort — building audiences, creating content, driving purchase decisions — but had no local platform to monetise it. MyStorefront was built to close that gap.",
          },
        ].map((item, i) => {
          const isOpen = openFaq === i;
          return (
            <div key={i} className="border-b border-foreground/10 last:border-b-0">
              <button
                onClick={() => setOpenFaq(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm sm:text-base font-medium hover:text-foreground/80 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{
                  maxHeight: isOpen ? "500px" : "0px",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <p className="pb-4 pr-8 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
