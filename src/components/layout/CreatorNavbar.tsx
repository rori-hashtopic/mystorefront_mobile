import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Settings, Instagram, Lock } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TierProgressPanel } from "@/components/creator/TierProgressPanel";
import { TIER_LABELS, hasTierAccess, type TierKey } from "@/lib/creatorTiers";
import logo from "@/assets/logo.svg";

interface CreatorNavbarProps {
  tier?: TierKey;
  displayName?: string;
  instagramConnected?: boolean;
  tiktokConnected?: boolean;
}

export function CreatorNavbar({
  tier,
  displayName,
  instagramConnected,
  tiktokConnected,
}: CreatorNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const unreadCount = useUnreadCount();

  // Only lock Messages once we know the tier — avoids a flash of "locked" while loading
  const tierKnown = tier !== undefined;
  const canAccessMessages = !tierKnown || hasTierAccess(tier, "ambassador");

  const navLinks = [
    { href: "/shop", label: "MyStorefront" },
    { href: "/explore", label: "Explore" },
    { href: "/analytics", label: "Analytics" },
    { href: "/earnings", label: "Earnings" },
    { href: "/discount-codes", label: "Codes" },
    { href: "/messages", label: "Messages" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    } else {
      navigate("/auth");
    }
    setIsLoggingOut(false);
  };

  return (
    <nav className="bg-background sticky top-0 z-40 border-b border-border">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2">
            <img src={logo} alt="MyStorefront" className="h-5 w-auto" />
            <span className="text-foreground font-display text-xl tracking-tight">MyStorefront</span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm transition-colors duration-200 relative ${
                  isActive(link.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {link.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Social Connection Status — icons */}
            {(instagramConnected || tiktokConnected) && (
              <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground/60">
                {instagramConnected && <Instagram className="h-3.5 w-3.5" />}
                {tiktokConnected && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                )}
              </div>
            )}

            {/* Tier progress hover */}
            {tier && (
              <HoverCard openDelay={150} closeDelay={120}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className="hidden sm:inline text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label={`View ${TIER_LABELS[tier]} tier progress`}
                  >
                    {TIER_LABELS[tier]}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent align="end" sideOffset={14} className="w-80 rounded-none border-border p-5 shadow-lg">
                  <TierProgressPanel tier={tier} />
                </HoverCardContent>
              </HoverCard>
            )}

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:bg-transparent hover:opacity-70 h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {/* Mobile Nav Links */}
                <div className="md:hidden">
                  {tier && (
                    <div className="px-3 py-3">
                      <TierProgressPanel tier={tier} compactExpandable />
                    </div>
                  )}
                  {tier && <DropdownMenuSeparator />}
                  {navLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link to={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem className="flex items-center gap-2" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
