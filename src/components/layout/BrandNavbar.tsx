import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Settings, Lock } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useEffect, useState } from "react";
import { preloadBrandRoutes } from "@/lib/preloadBrandRoutes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { canAccessPaidCollabs } from "@/lib/paidCollabsAccess";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";

interface BrandNavbarProps {
  brandName?: string;
  brandPlan?: "free" | "premium";
}

type NavLink = { href: string; label: string; comingSoon?: boolean };

export function BrandNavbar({ brandName, brandPlan }: BrandNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const unreadCount = useUnreadCount();

  const { user } = useAuth();
  const paidCollabsUnlocked = canAccessPaidCollabs(user?.email);

  // Preload all brand-area route chunks so cross-page navigation is instant.
  useEffect(() => {
    preloadBrandRoutes();
  }, []);

  const navLinks: NavLink[] = [
    { href: "/brand/creators", label: "Creators" },
    { href: "/brand/messages", label: "Messages" },
    { href: "/brand/paid-collabs", label: "Paid Collabs", comingSoon: !paidCollabsUnlocked },
    { href: "/brand/analytics", label: "Analytics" },
    { href: "/brand/payments", label: "Payments" },
  ];

  const isActive = (href: string) => location.pathname.startsWith(href);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !/auth session missing/i.test(error.message)) {
        toast({
          title: "Error signing out",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      navigate("/auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderLink = (link: NavLink) => {
    if (link.comingSoon) {
      return (
        <span
          key={link.href}
          className="nav-link relative text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5"
        >
          <Lock className="h-3 w-3" />
          {link.label}
        </span>
      );
    }
    return (
      <Link
        key={link.href}
        to={link.href}
        className={`nav-link relative ${isActive(link.href) ? "nav-link-active" : ""}`}
      >
        {link.label}
        {link.href === "/brand/messages" && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-3.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-card sticky top-0 z-40 border-b border-border">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/brand" className="flex items-center gap-2">
            <img src={logo} alt="MyStorefront" className="h-5 w-auto" />
            <span className="text-foreground font-display text-xl tracking-tight">MyStorefront Brands</span>
          </Link>

          {/* Nav Links (desktop) */}
          <div className="hidden lg:flex items-center gap-5">{navLinks.map(renderLink)}</div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {brandPlan && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium hidden sm:inline-block ${
                  brandPlan === "premium" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {brandPlan === "premium" ? "Premium" : "Free"}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem className="flex items-center gap-2" asChild>
                  <Link to="/brand/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Mobile-only nav links */}
                <div className="lg:hidden">
                  {navLinks.map((link) =>
                    link.comingSoon ? (
                      <DropdownMenuItem
                        key={link.href}
                        disabled
                        className="text-muted-foreground/40 flex items-center gap-1.5"
                      >
                        <Lock className="h-3 w-3" />
                        {link.label}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link to={link.href}>{link.label}</Link>
                      </DropdownMenuItem>
                    ),
                  )}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
