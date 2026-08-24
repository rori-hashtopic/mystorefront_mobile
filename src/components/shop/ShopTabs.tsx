import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShopTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const tabs = [
  { id: "all-products", label: "All Products" },
  { id: "collections", label: "Collections" },
  { id: "instagram", label: "Instagram / Shoppable Posts", comingSoon: true },
  { id: "tiktok", label: "TikTok", comingSoon: true },
];

export function ShopTabs({ 
  activeTab, 
  onTabChange, 
  searchQuery,
  onSearchChange 
}: ShopTabsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        handleCloseSearch();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    onSearchChange("");
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  return (
    <div className="mb-8 sm:mb-10">
      {/* Thin rule above tabs */}
      <div className="w-full h-px bg-border mb-6 sm:mb-8" />

      <div className="flex items-center justify-center relative">
        {/* Search - Left Side */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          {!isSearchOpen ? (
            <button
              onClick={handleOpenSearch}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors group p-2 -m-2 min-h-[44px] min-w-[44px]"
            >
              <Search className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="border-b border-transparent group-hover:border-current hidden sm:inline">Search</span>
            </button>
          ) : null}
        </div>

        {/* Expanded Search Bar - Centered */}
        {isSearchOpen ? (
          <div className="flex items-center gap-2 w-full max-w-md mx-auto animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search products"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-7 h-10 bg-transparent border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-colors"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleCloseSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Text-based tab navigation - scrollable on mobile */
          <nav className="flex items-center gap-4 sm:gap-8 md:gap-12 overflow-x-auto scrollbar-hide max-w-full px-8 sm:px-0 snap-x snap-mandatory">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isComingSoon = tab.comingSoon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !isComingSoon && onTabChange(tab.id)}
                  disabled={isComingSoon}
                  className={`
                    relative text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] py-2 whitespace-nowrap snap-center
                    transition-colors duration-200 min-h-[44px] flex items-center gap-1.5
                    ${isComingSoon
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {tab.label}
                  {isComingSoon && (
                    <span className="text-[10px] normal-case tracking-normal text-muted-foreground/40">Coming Soon</span>
                  )}
                  {isActive && !isComingSoon && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Thin rule below tabs */}
      <div className="w-full h-px bg-border mt-6 sm:mt-8" />
    </div>
  );
}
