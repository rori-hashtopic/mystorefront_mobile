import { useEffect, useState } from "react";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Tracks the bounding rect of an element matching the given selector.
 * Re-measures on resize, scroll, and DOM mutations.
 */
export function useTourTarget(selector: string | null, enabled: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!enabled || !selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let pollTimer: number | null = null;

    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el || cancelled) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~6s
    const poll = () => {
      if (cancelled) return;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        // Bring target into view (instant — smooth scroll delays measurement).
        try {
          el.scrollIntoView({ block: "center", inline: "nearest" });
        } catch {
          // ignore
        }
        // Measure now and again on next frame to catch post-scroll position.
        measure();
        requestAnimationFrame(measure);
        observer = new ResizeObserver(schedule);
        observer.observe(el);
        mutationObserver = new MutationObserver(schedule);
        mutationObserver.observe(document.body, { childList: true, subtree: true });
      } else if (attempts < MAX_ATTEMPTS) {
        attempts += 1;
        pollTimer = window.setTimeout(poll, 100);
      }
    };
    poll();

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [selector, enabled]);

  return rect;
}
