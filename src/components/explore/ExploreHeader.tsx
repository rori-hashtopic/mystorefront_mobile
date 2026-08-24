import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ExploreSortDropdown, SortOption } from "./ExploreSortDropdown";

interface ExploreHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function ExploreHeader({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: ExploreHeaderProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Title */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground mb-2 sm:mb-3">
          The Collection
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground">
          Explore
        </h1>
        <div className="w-16 sm:w-24 h-px bg-border mx-auto mt-4 sm:mt-6" />
      </div>

      {/* Search + Sort Row */}
      <div className="flex flex-col items-stretch gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, creators, or brands"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 h-12 bg-transparent border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-colors text-base text-center sm:text-left placeholder:text-center sm:placeholder:text-left"
          />
        </div>
        <div className="flex justify-center">
          <ExploreSortDropdown value={sortBy} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}
