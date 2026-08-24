import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTourTarget } from "./useTourTarget";
import storefrontPreviewImage from "@/assets/demo-tour-storefront-preview.png";

const STORAGE_KEY = "mystorefront_brand_demo_tour_completed";
const SESSION_KEY = "mystorefront_brand_demo_tour_state";
const FOOTER_DISMISSED_KEY = "mystorefront_brand_demo_footer_dismissed";
const RESTART_EVENT = "mystorefront:restart-tour";
const FOOTER_EVENT = "mystorefront:show-demo-footer";

interface Step {
  id: number;
  type: "modal" | "spotlight";
  path: string;
  selector: string | null;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
}

interface StoredTourState {
  isOpen: boolean;
  stepIndex: number;
}

const STEPS: Step[] = [
  {
    id: 1,
    type: "modal",
    path: "/demo/brand/analytics",
    selector: null,
    title: "Influencer marketing, without the gamble.",
    body: "MyStorefront is a creator affiliate platform. Creators feature your products on their storefronts, share tracked affiliate links with their followers, and drive sales to your store. You only pay commission on confirmed sales. No upfront fees. Nothing if a post flops.",
    primary: "Next: See how sales are tracked →",
  },
  {
    id: 2,
    type: "spotlight",
    path: "/demo/brand/analytics",
    selector: "#tour-analytics-kpis",
    title: "See exactly which creator drove which sale.",
    body: "Clicks, orders, revenue, and commission - tracked per creator, updated in real time. You'll always know which creators are generating sales and how much revenue each one brings in.",
    primary: "Next: See how you pay →",
    secondary: "Back",
  },
  {
    id: 3,
    type: "spotlight",
    path: "/demo/brand/payments",
    selector: "#tour-payments-current-invoice",
    title: "You set the rate. You pay on results.",
    body: "At the end of each month, we invoice you for commission on confirmed sales - nothing more. You pay us, we pay the creators. You set your own commission rate when you connect your store. ",
    primary: "Next: Optional premium tools →",
    secondary: "Back",
  },
  {
    id: 4,
    type: "spotlight",
    path: "/demo/brand/analytics",
    selector: "#tour-premium-nav-group",
    title: "When you're ready, there's more.",
    body: "The free affiliate tools tier gives you everything you need to start earning on commission. The premium plan adds the tools to scale - creator discovery, messaging, gifting, mentions, and discount codes.",
    primary: "Finish the tour",
    secondary: "Back",
  },
];

const PADDING = 8;

function getDefaultState(): StoredTourState {
  return { isOpen: false, stepIndex: 0 };
}

function readStoredTourState(): StoredTourState {
  if (typeof window === "undefined") return getDefaultState();

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return getDefaultState();

    const parsed = JSON.parse(raw) as Partial<StoredTourState>;
    const safeIndex = Number.isInteger(parsed.stepIndex)
      ? Math.min(Math.max(Number(parsed.stepIndex), 0), STEPS.length - 1)
      : 0;

    return {
      isOpen: Boolean(parsed.isOpen),
      stepIndex: safeIndex,
    };
  } catch {
    return getDefaultState();
  }
}

function writeStoredTourState(state: StoredTourState | null) {
  if (typeof window === "undefined") return;

  if (!state) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, index) => (
        <span
          key={step.id}
          className={`h-1.5 rounded-full transition-all ${
            index === stepIndex ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-2 whitespace-nowrap text-[11px] text-muted-foreground">
        Step {stepIndex + 1} of {STEPS.length}
      </span>
    </div>
  );
}

export function BrandDemoTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState<boolean>(() => readStoredTourState().isOpen);
  const [stepIndex, setStepIndex] = useState<number>(() => readStoredTourState().stepIndex);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showFooter, setShowFooter] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const completed = localStorage.getItem(STORAGE_KEY);
    const dismissed = localStorage.getItem(FOOTER_DISMISSED_KEY);
    return completed === "true" && dismissed !== "true";
  });

  const step = STEPS[stepIndex];
  const isOnStepRoute = Boolean(step && location.pathname === step.path);
  const targetRect = useTourTarget(
    step?.type === "spotlight" && isOnStepRoute ? step.selector : null,
    isOpen
  );

  useEffect(() => {
    if (!isOpen) {
      writeStoredTourState(null);
      return;
    }

    writeStoredTourState({ isOpen: true, stepIndex });
  }, [isOpen, stepIndex]);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed && !isOpen && location.pathname === "/demo/brand") {
      setStepIndex(0);
      setIsOpen(true);
    }
  }, [isOpen, location.pathname]);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FOOTER_DISMISSED_KEY);
      writeStoredTourState({ isOpen: true, stepIndex: 0 });
      setStepIndex(0);
      setIsOpen(true);
      setShowCompletion(false);
      setShowFooter(false);
    };

    window.addEventListener(RESTART_EVENT, handler);
    return () => window.removeEventListener(RESTART_EVENT, handler);
  }, []);

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    writeStoredTourState(null);
    setIsOpen(false);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    writeStoredTourState(null);
    setIsOpen(false);
    setShowCompletion(true);
  }, []);

  const dismissCompletion = useCallback(() => {
    setShowCompletion(false);
    toast("Click any tab to explore. Ready to join? Let us know so we can get you started.", {
      duration: 8000,
    });
    const dismissed = localStorage.getItem(FOOTER_DISMISSED_KEY);
    if (dismissed !== "true") {
      window.setTimeout(() => setShowFooter(true), 8000);
    }
  }, []);

  const dismissFooter = useCallback(() => {
    localStorage.setItem(FOOTER_DISMISSED_KEY, "true");
    setShowFooter(false);
  }, []);

  // Esc-to-close intentionally disabled: tour must be completed via the CTA button.

  const goToStep = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= STEPS.length) return;

      const nextStep = STEPS[newIndex];
      writeStoredTourState({ isOpen: true, stepIndex: newIndex });
      setStepIndex(newIndex);
      setIsOpen(true);

      if (nextStep.path !== location.pathname) {
        navigate(nextStep.path);
      }
    },
    [location.pathname, navigate]
  );

  const handlePrimary = () => {
    if (stepIndex === STEPS.length - 1) {
      finishTour();
      return;
    }

    goToStep(stepIndex + 1);
  };

  const handleSecondary = () => {
    if (stepIndex === 0) {
      close();
      return;
    }

    goToStep(stepIndex - 1);
  };

  const completionModal = showCompletion
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Demo complete
                </p>
                <h2 className="mb-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
                  That's the tour.
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Have a look around. If you're ready to join, just reply to roxi@mystorefront.io and we'll get you set up - and if you've got questions or want the full pitch deck, reply to the same email, and I'll send it through.
              </p>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={dismissCompletion} className="rounded-full">
                  Keep exploring
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const footerStrip = showFooter
    ? createPortal(
        <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[90] border-t border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Ready to join the launch? Let us know so we can get you started - roxi@mystorefront.io
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismissFooter}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  if (!isOpen || !step) {
    return (
      <>
        {completionModal}
        {footerStrip}
      </>
    );
  }

  if (step.type === "modal") {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                HOW IT WORKS
              </p>
              <h2 className="mb-2 font-display text-2xl font-bold leading-tight sm:text-2xl">
                {step.title}
              </h2>
            </div>

            <img
              src={storefrontPreviewImage}
              alt="MyStorefront creator shop preview"
              className="mx-auto w-full max-w-[160px] sm:max-w-[180px] rounded-lg"
            />

            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

            <div className="flex flex-row items-center justify-between gap-3 pt-2">
              <StepIndicator stepIndex={stepIndex} />
              <div className="flex items-center gap-2">
                {step.secondary && (
                  <Button variant="ghost" size="sm" onClick={handleSecondary}>
                    {step.secondary}
                  </Button>
                )}
                <Button size="sm" onClick={handlePrimary} className="rounded-full">
                  <span className="sm:hidden">Next →</span>
                  <span className="hidden sm:inline">{step.primary}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (!isOnStepRoute || !targetRect) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/60">
        <div className="pointer-events-auto fixed bottom-4 left-4 right-4 rounded-2xl border border-border bg-card p-5 shadow-xl sm:left-1/2 sm:right-auto sm:w-[420px] sm:-translate-x-1/2">
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold leading-tight">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            {stepIndex === STEPS.length - 1 && (
              <div className="rounded-lg border border-foreground/20 bg-foreground/5 px-3 py-2 text-xs font-medium text-foreground">
                🎉 First 10 brands to join get 3 months of premium tools free
              </div>
            )}

            <div className="flex flex-col-reverse justify-between gap-3 pt-1 sm:flex-row sm:items-center">
              <StepIndicator stepIndex={stepIndex} />
              <div className="flex flex-nowrap items-center justify-end gap-2">
                {step.secondary && (
                  <Button variant="ghost" size="sm" onClick={handleSecondary}>
                    {step.secondary}
                  </Button>
                )}
                <Button size="sm" onClick={handlePrimary} className="rounded-full">
                  {step.primary}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const cutout = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  };

  const TOOLTIP_W = 420;
  const TOOLTIP_OFFSET = 12;
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const spaceBelow = viewportH - (cutout.top + cutout.height);
  const placeBelow = spaceBelow > 240;

  const tooltipTop = placeBelow
    ? cutout.top + cutout.height + TOOLTIP_OFFSET
    : Math.max(16, cutout.top - TOOLTIP_OFFSET - 240);

  let tooltipLeft = cutout.left + cutout.width / 2 - TOOLTIP_W / 2;
  tooltipLeft = Math.max(16, Math.min(viewportW - TOOLTIP_W - 16, tooltipLeft));

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div
        className="pointer-events-auto absolute rounded-xl transition-all duration-200"
        style={{
          top: cutout.top,
          left: cutout.left,
          width: cutout.width,
          height: cutout.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        }}
        onClick={(event) => event.stopPropagation()}
      />

      <div
        className={
          isMobile
            ? "pointer-events-auto fixed bottom-4 left-4 right-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
            : "pointer-events-auto absolute rounded-2xl border border-border bg-card p-5 shadow-xl"
        }
        style={isMobile ? undefined : { top: tooltipTop, left: tooltipLeft, width: TOOLTIP_W }}
      >
        {!isMobile && (
          <div
            className="absolute h-3 w-3 rotate-45 bg-card border-border"
            style={
              placeBelow
                ? {
                    top: -6,
                    left: Math.max(
                      16,
                      Math.min(TOOLTIP_W - 24, cutout.left + cutout.width / 2 - tooltipLeft - 6)
                    ),
                    borderTop: "1px solid hsl(var(--border))",
                    borderLeft: "1px solid hsl(var(--border))",
                  }
                : {
                    bottom: -6,
                    left: Math.max(
                      16,
                      Math.min(TOOLTIP_W - 24, cutout.left + cutout.width / 2 - tooltipLeft - 6)
                    ),
                    borderBottom: "1px solid hsl(var(--border))",
                    borderRight: "1px solid hsl(var(--border))",
                  }
            }
          />
        )}

        <div className="space-y-3">
          <h3 className="font-display text-lg font-bold leading-tight">{step.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          {stepIndex === STEPS.length - 1 && (
            <div className="rounded-lg border border-foreground/20 bg-foreground/5 px-3 py-2 text-xs font-medium text-foreground">
              🎉 First 10 brands to join get 3 months of premium tools free
            </div>
          )}

          <div className="flex flex-col gap-3 pt-1">
            <StepIndicator stepIndex={stepIndex} />
            <div className="flex flex-nowrap items-center justify-end gap-2">
              {step.secondary && (
                <Button variant="ghost" size="sm" onClick={handleSecondary}>
                  {step.secondary}
                </Button>
              )}
              <Button size="sm" onClick={handlePrimary} className="rounded-full">
                {step.primary}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function restartBrandDemoTour() {
  localStorage.removeItem(STORAGE_KEY);
  writeStoredTourState({ isOpen: true, stepIndex: 0 });
  window.dispatchEvent(new CustomEvent(RESTART_EVENT));
}
