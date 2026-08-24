import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "trending" | "newest" | "most-saved";

interface ExploreSortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most-saved", label: "Most Saved" },
];

export function ExploreSortDropdown({ value, onChange }: ExploreSortDropdownProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[140px] h-12 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 text-xs uppercase tracking-[0.15em]">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className="text-xs uppercase tracking-[0.1em]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
