import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Users, User, LogOut, Menu, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";

interface PublicHeaderProps {
  onAuthRequired?: () => void;
}

export function PublicHeader({ onAuthRequired }: PublicHeaderProps) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { toast } = useToast();
  const [shopperName, setShopperName] = useState<string>("");

  useEffect(() => {
    if (!user || role !== "shopper") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shopper_profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data?.name) setShopperName(data.name);
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Could not sign out",
        variant: "destructive",
      });
    }
  };

  const handleProtectedClick = (e: React.MouseEvent, path: string) => {
    if (!user && onAuthRequired) {
      e.preventDefault();
      onAuthRequired();
    }
  };

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    switch (role) {
      case "creator":
        return "/";
      case "brand":
        return "/brand";
      case "admin":
        return "/admin";
      case "shopper":
        return "/discover";
      default:
        return "/";
    }
  };

  return (
    <header className="bg-nav sticky top-0 z-40 border-b border-nav-muted/20">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="MyStorefront" className="h-5 w-auto" />
            <span className="text-nav-foreground font-display text-xl tracking-tight hidden sm:block">
              MyStorefront
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4">
            {user ? (
              <>
                {role !== "shopper" && (
                  <Button variant="ghost" size="sm" asChild className="text-nav-foreground">
                    <Link to="/explore">
                      <Compass className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Explore</span>
                    </Link>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-nav-foreground">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {role === "shopper" ? (
                      <>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{shopperName || user.email?.split("@")[0] || "Profile"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/shopper/settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/explore" className="flex items-center">
                            <Compass className="mr-2 h-4 w-4" />
                            Explore
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/wishlist" className="flex items-center">
                            <Heart className="mr-2 h-4 w-4" />
                            My Wishlist
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/following" className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Following
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {role && (
                          <DropdownMenuItem asChild>
                            <Link to={getDashboardLink()} className="flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-nav-foreground hidden sm:flex"
                  onClick={(e) => handleProtectedClick(e, "/wishlist")}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Wishlist
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
