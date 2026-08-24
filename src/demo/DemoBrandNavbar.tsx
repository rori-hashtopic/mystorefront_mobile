import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Settings, User, LogIn, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import { restartBrandDemoTour } from "./tour/BrandDemoTour";

interface DemoBrandNavbarProps {
  brandName: string;
  brandStatus: "pending" | "approved" | "rejected" | "suspended";
}

type NavLink = { href: string; label: string; tier: "free" | "paid" };

export function DemoBrandNavbar({ brandName, brandStatus }: DemoBrandNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleRestartTour = () => {
    if (location.pathname !== "/demo/brand/analytics") {
      navigate("/demo/brand/analytics");
    }
    setTimeout(() => restartBrandDemoTour(), 50);
  };

  const freeLinks: NavLink[] = [
    { href: "/demo/brand/analytics", label: "Analytics", tier: "free" },
    { href: "/demo/brand/payments", label: "Payments", tier: "free" },
  ];

  const paidLinks: NavLink[] = [
    { href: "/demo/brand/creators", label: "Creators", tier: "paid" },
    { href: "/demo/brand/messages", label: "Messages", tier: "paid" },
    { href: "/demo/brand/mentions", label: "Mentions", tier: "paid" },
    { href: "/demo/brand/gifting", label: "Gifting", tier: "paid" },
    { href: "/demo/brand/discount-codes", label: "Discount Codes", tier: "paid" },
  ];

  const isActive = (href: string) => location.pathname.startsWith(href);

  const ProPill = () => (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-foreground px-1.5 py-0.5 text-[8px] font-semibold tracking-wider text-background align-middle">
      PRO
    </span>
  );

  return (
    <nav className="bg-card sticky top-0 z-40 border-b border-border">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + DEMO pill */}
          <Link to="/demo/brand" className="flex items-center gap-2">
            <img src={logo} alt="MyStorefront" className="h-5 w-auto" />
            <span className="text-foreground font-display text-xl tracking-tight hidden sm:block">
              MyStorefront Brands
            </span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-foreground text-background">
              DEMO
            </span>
          </Link>
          <button
            onClick={handleRestartTour}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Restart tour
          </button>

          {/* Center Nav Links */}
          <div className="hidden lg:flex items-center gap-5">
            {/* Free group */}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.15em] text-emerald-700 font-semibold mb-0.5">
                Included free
              </span>
              <div className="flex items-center gap-5">
                {freeLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`nav-link ${isActive(link.href) ? "nav-link-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-10 border-l border-border" />

            {/* Paid group */}
            <div id="tour-premium-nav-group" data-tour="premium-nav-group" className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.15em] text-foreground font-semibold mb-0.5">
                Premium plan
              </span>
              <div className="flex items-center gap-5">
                {paidLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`nav-link ${isActive(link.href) ? "nav-link-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{brandName}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" asChild>
                  <Link to="/demo/brand/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="lg:hidden">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-emerald-700">
                    Included free
                  </DropdownMenuLabel>
                  {freeLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link to={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-foreground">
                    Premium plan
                  </DropdownMenuLabel>
                  {paidLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link to={link.href} className="flex items-center justify-between w-full">
                        <span>{link.label}</span>
                        <ProPill />
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/landing" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Exit demo</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
