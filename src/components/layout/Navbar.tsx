import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, User, Settings } from "lucide-react";
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
import logo from "@/assets/logo.svg";

interface NavbarProps {
  tier?: "enthusiast" | "ambassador" | "trendsetter" | "icon";
  displayName?: string;
}

export function Navbar({ tier = "enthusiast", displayName }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinks = [
    { href: "/shop", label: "MyStorefront" },
    { href: "/explore", label: "Explore" },
    { href: "/links", label: "Links" },
    { href: "/earnings", label: "Earnings" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const tierLabels: Record<string, string> = {
    enthusiast: "Enthusiast",
    ambassador: "Ambassador",
    trendsetter: "Trendsetter",
    icon: "Icon",
  };

  const tierStyles: Record<string, string> = {
    enthusiast: "tier-enthusiast",
    ambassador: "tier-ambassador",
    trendsetter: "tier-trendsetter",
    icon: "tier-icon",
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
    setIsLoggingOut(false);
  };

  return (
    <nav className="bg-nav sticky top-0 z-40 border-b border-nav-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2">
            <img src={logo} alt="MyStorefront" className="h-8 w-auto" />
            <span className="text-nav-foreground font-display text-xl font-semibold hidden sm:block">MyStorefront</span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`nav-link pb-1 ${isActive(link.href) ? "nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Notification Badge */}
            <div className="relative">
              <div className="w-2 h-2 bg-primary rounded-full absolute -top-0.5 -right-0.5" />
              <div className="w-5 h-5" />
            </div>

            {/* Tier Pill */}
            <div className={`tier-pill ${tierStyles[tier]} hidden sm:block`}>{tierLabels[tier]}</div>
            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-nav-foreground hover:bg-nav-muted/20">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{displayName || "Profile"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Mobile Nav Links */}
                <div className="md:hidden">
                  {navLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link to={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
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
