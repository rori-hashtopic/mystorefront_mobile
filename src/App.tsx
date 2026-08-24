import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Landing from "./pages/Landing";
import WelcomeRedirect from "./pages/WelcomeRedirect";

const lazyWithRetry = <T extends ComponentType<unknown>>(importer: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem("mystorefront:lazy-reload-attempted");
      return module;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransientImportError =
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          message,
        );

      if (isTransientImportError && !sessionStorage.getItem("mystorefront:lazy-reload-attempted")) {
        sessionStorage.setItem("mystorefront:lazy-reload-attempted", "true");
        window.location.reload();
        return new Promise<{ default: T }>(() => undefined);
      }

      throw error;
    }
  });

const LegacyCreatorShopRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const canonicalPath = username ? `/${encodeURIComponent(username)}` : "/landing";

  return <Navigate to={canonicalPath} replace />;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; info: string | null }
> {
  state = { hasError: false, error: null as Error | null, info: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render error", error, errorInfo);
    this.setState({ error, info: errorInfo.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">Something failed to load</h1>
          <p className="max-w-sm text-sm text-muted-foreground">Refresh the page to reconnect to the latest version.</p>
          {err && (
            <details className="max-w-xl w-full text-left">
              <summary className="cursor-pointer text-xs font-medium text-foreground">Show error details</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/40 p-3 text-[11px] text-foreground">
                {err.name}: {err.message}
                {err.stack ? "\n\n" + err.stack : ""}
                {this.state.info ? "\n\nComponent stack:" + this.state.info : ""}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CreatorInvite = lazy(() => import("./pages/CreatorInvite"));
const BecomeCreator = lazy(() => import("./pages/BecomeCreator"));
const BecomeCreatorSubmitted = lazy(() =>
  import("./pages/BecomeCreator").then((module) => ({ default: module.BecomeCreatorSubmitted })),
);
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const Shop = lazy(() => import("./pages/Shop"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Earnings = lazy(() => import("./pages/Earnings"));
const DiscountCodes = lazy(() => import("./pages/DiscountCodes"));
const CreatorMessages = lazy(() => import("./pages/CreatorMessages"));
const CreatorSettings = lazy(() => import("./pages/CreatorSettings"));
const Help = lazy(() => import("./pages/Help"));
const ExploreRouter = lazy(() => import("./pages/ExploreRouter"));
const BrandOnboarding = lazy(() => import("./pages/BrandOnboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BrandInviteLanding = lazy(() => import("./pages/BrandInviteLanding"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminCreators = lazy(() => import("./pages/admin/AdminCreators"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminBrandPayments = lazy(() => import("./pages/admin/AdminBrandPayments"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));

// Brand pages
const BrandDashboard = lazy(() => import("./pages/brand/BrandDashboard"));
const BrandMessages = lazy(() => import("./pages/brand/BrandMessages"));
const BrandPayments = lazy(() => import("./pages/brand/BrandPayments"));

const BrandAnalytics = lazy(() => import("./pages/brand/BrandAnalytics"));
const BrandSettings = lazy(() => import("./pages/brand/BrandSettings"));
const BrandHelp = lazy(() => import("./pages/brand/BrandHelp"));
const CreatorAnalytics = lazy(() => import("./pages/brand/CreatorAnalytics"));
const CreatorDirectory = lazy(() => import("./pages/brand/CreatorDirectory"));
// BrandGifting retired — /brand/gifting now redirects to /brand/paid-collabs.
// BrandDiscountCodes retired — /brand/discount-codes now redirects to /brand/paid-collabs,
// where discount codes live as their own section.
const BrandMentions = lazy(() => import("./pages/brand/BrandMentions"));
const BrandPaidCollabs = lazy(() => import("./pages/brand/BrandPaidCollabs"));

// Creator gifting & mentions
const Gifting = lazy(() => import("./pages/Gifting"));
const Mentions = lazy(() => import("./pages/Mentions"));

// Shop pages
const PublicCreatorShop = lazy(() => import("./pages/shop/PublicCreatorShop"));

// Demo (brand) pages
const DemoBrandDashboard = lazy(() => import("./demo/pages/DemoBrandDashboard"));
const DemoCreatorDirectory = lazy(() => import("./demo/pages/DemoCreatorDirectory"));
const DemoCreatorAnalytics = lazy(() => import("./demo/pages/DemoCreatorAnalytics"));
const DemoBrandAnalytics = lazy(() => import("./demo/pages/DemoBrandAnalytics"));
const DemoBrandMessages = lazy(() => import("./demo/pages/DemoBrandMessages"));
const DemoBrandMentions = lazy(() => import("./demo/pages/DemoBrandMentions"));
const DemoBrandGifting = lazy(() => import("./demo/pages/DemoBrandGifting"));
const DemoBrandDiscountCodes = lazy(() => import("./demo/pages/DemoBrandDiscountCodes"));
const DemoBrandPayments = lazy(() => import("./demo/pages/DemoBrandPayments"));
const DemoBrandProfile = lazy(() => import("./demo/pages/DemoBrandProfile"));
const DemoBrandSettings = lazy(() => import("./demo/pages/DemoBrandSettings"));

// Shopper pages
const ShopperExplore = lazy(() => import("./pages/shopper/ShopperExploreContent"));
const ShopperFollowing = lazy(() => import("./pages/shopper/ShopperFollowing"));
const ShopperSettings = lazy(() => import("./pages/shopper/ShopperSettings"));
const ShopperWishlist = lazy(() => import("./pages/shopper/ShopperWishlist"));

// Auth pages
const InstagramCallback = lazy(() => import("./pages/auth/InstagramCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookieNotice = lazy(() => import("./pages/CookieNotice"));
const PluginPrivacyAddendum = lazy(() => import("./pages/PluginPrivacyAddendum"));
const Terms = lazy(() => import("./pages/Terms"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Walkthrough = lazy(() => import("./pages/Walkthrough"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/walkthrough" element={<Walkthrough />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/welcome" element={<WelcomeRedirect />} />
              <Route path="/creator-invite" element={<CreatorInvite />} />
              <Route path="/brand-invite" element={<BrandInviteLanding />} />
              <Route path="/become-a-creator" element={<BecomeCreator />} />
              <Route path="/become-a-creator/submitted" element={<BecomeCreatorSubmitted />} />
              <Route path="/onboarding" element={<BrandOnboarding />} />
              <Route path="/brand/dashboard" element={<Navigate to="/brand" replace />} />
              <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookie-notice" element={<CookieNotice />} />
              <Route path="/plugin-privacy-addendum" element={<PluginPrivacyAddendum />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/tos" element={<Terms />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/role-selection" element={<Navigate to="/auth" replace />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/earnings" element={<Earnings />} />
              <Route path="/discount-codes" element={<DiscountCodes />} />
              <Route path="/messages" element={<CreatorMessages />} />
              <Route path="/settings" element={<CreatorSettings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/gifting" element={<Navigate to="/messages" replace />} />
              <Route path="/mentions" element={<Navigate to="/messages" replace />} />
              <Route path="/explore/*" element={<ExploreRouter />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/creators" element={<AdminCreators />} />
              <Route path="/admin/brands" element={<AdminBrands />} />
              <Route path="/admin/payouts" element={<AdminPayouts />} />
              <Route path="/admin/brand-payments" element={<AdminBrandPayments />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/moderation" element={<AdminModeration />} />
              <Route path="/admin/logs" element={<AdminLogs />} />

              {/* Brand */}
              <Route path="/brand" element={<BrandDashboard />} />
              <Route path="/brand/messages" element={<BrandMessages />} />
              <Route path="/brand/payments" element={<BrandPayments />} />

              <Route path="/brand/analytics" element={<BrandAnalytics />} />
              <Route path="/brand/settings" element={<BrandSettings />} />
              <Route path="/brand/help" element={<BrandHelp />} />
              <Route path="/brand/creator-analytics/:creatorId" element={<CreatorAnalytics />} />
              <Route path="/brand/creators" element={<CreatorDirectory />} />
              <Route path="/brand/gifting" element={<Navigate to="/brand/paid-collabs" replace />} />
              <Route path="/brand/discount-codes" element={<Navigate to="/brand/paid-collabs" replace />} />
              <Route path="/brand/mentions" element={<BrandMentions />} />
              <Route path="/brand/paid-collabs" element={<BrandPaidCollabs />} />

              {/* Demo (brand) — no login required */}
              <Route path="/demo/brand" element={<DemoBrandDashboard />} />
              <Route path="/demo/brand/creators" element={<DemoCreatorDirectory />} />
              <Route path="/demo/brand/creator-analytics/:creatorId" element={<DemoCreatorAnalytics />} />
              <Route path="/demo/brand/analytics" element={<DemoBrandAnalytics />} />
              <Route path="/demo/brand/messages" element={<DemoBrandMessages />} />
              <Route path="/demo/brand/mentions" element={<DemoBrandMentions />} />
              <Route path="/demo/brand/gifting" element={<DemoBrandGifting />} />
              <Route path="/demo/brand/discount-codes" element={<DemoBrandDiscountCodes />} />
              <Route path="/demo/brand/payments" element={<DemoBrandPayments />} />
              <Route path="/demo/brand/profile" element={<DemoBrandProfile />} />
              <Route path="/demo/brand/settings" element={<DemoBrandSettings />} />

              {/* Legacy public shop paths — redirect to canonical /:username */}
              <Route path="/shop/:username" element={<LegacyCreatorShopRedirect />} />
              <Route path="/storefront/:username" element={<LegacyCreatorShopRedirect />} />
              <Route path="/c/:username" element={<LegacyCreatorShopRedirect />} />

              {/* Shopper */}
              <Route path="/shopper/explore" element={<ShopperExplore showLayout={true} />} />
              <Route path="/shopper/following" element={<ShopperFollowing />} />
              <Route path="/shopper/settings" element={<ShopperSettings />} />
              <Route path="/shopper/wishlist" element={<ShopperWishlist />} />

              {/* Public creator storefront */}
              <Route path="/:username" element={<PublicCreatorShop />} />

              {/* Fallback: redirect unknown routes to landing */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
