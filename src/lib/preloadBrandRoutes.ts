// Eagerly preload all brand-area route chunks so navigation between
// brand pages feels instant (no lazy-chunk lag during transitions).

const importers = [
  () => import("@/pages/brand/BrandDashboard"),
  () => import("@/pages/brand/BrandMessages"),
  () => import("@/pages/brand/BrandPayments"),

  () => import("@/pages/brand/BrandAnalytics"),
  () => import("@/pages/brand/BrandSettings"),
  () => import("@/pages/brand/CreatorDirectory"),
  () => import("@/pages/brand/CreatorAnalytics"),
  // BrandGifting retired — gifting now lives inside BrandPaidCollabs.
  // BrandDiscountCodes retired — discount codes now live inside BrandPaidCollabs.
  () => import("@/pages/brand/BrandMentions"),
  () => import("@/pages/brand/BrandPaidCollabs"),
];

let started = false;

export function preloadBrandRoutes() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Fire-and-forget. Errors are non-fatal — the lazy() loader will retry.
  for (const imp of importers) {
    imp().catch(() => {
      /* ignore */
    });
  }
}
