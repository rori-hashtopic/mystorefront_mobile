export type ExploreTabType = "products" | "creators" | "brands" | "following" | "wishlist";

interface ExploreTabsProps {
  activeTab: ExploreTabType;
  onTabChange: (tab: ExploreTabType) => void;
}

const tabs: { id: ExploreTabType; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "creators", label: "Creators" },
  { id: "following", label: "Following" },
  { id: "wishlist", label: "Wishlist" },
];

export function ExploreTabs({ activeTab, onTabChange }: ExploreTabsProps) {
  return (
    <nav className="flex justify-start sm:justify-center overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-4 sm:gap-8 md:gap-12 px-4 sm:px-0 snap-x snap-mandatory">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] py-2 whitespace-nowrap snap-start
                transition-colors duration-200 min-h-[44px] flex items-center
                ${isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}
              `}
            >
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
