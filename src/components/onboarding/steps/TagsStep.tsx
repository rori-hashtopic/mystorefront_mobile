import { Input } from "@/components/ui/input";

interface TagsStepProps {
  data: {
    locations: string[];
    niches: string[];
    attributes: string[];
  };
  onChange: (data: Partial<TagsStepProps["data"]>) => void;
}

const LOCATIONS = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape", "Outside South Africa",
];

const NICHES = [
  "Fashion", "Beauty", "Skincare", "Wellness", "Fitness", "Home",
  "Menswear", "Cooking", "Family", "Sports", "Travel", "Other",
];

const OTHER_NICHE = "Other";

const ATTRIBUTES = [
  "Podcast Host", "Dermatologist", "Model", "Stylist", "Lifestyle Influencer",
  "Athlete", "Makeup Artist", "Photographer", "Fashion Blogger", "Fitness Trainer",
  "Chef", "Interior Designer",
];

export function TagsStep({ data, onChange }: TagsStepProps) {
  const customNiche = data.niches.find((niche) => !NICHES.includes(niche)) || "";
  const showCustomNicheInput = data.niches.includes(OTHER_NICHE) || customNiche.length > 0;

  const selectLocation = (location: string) => {
    onChange({ locations: [location] });
  };

  const toggleNiche = (niche: string) => {
    if (niche !== OTHER_NICHE) {
      toggleItem("niches", niche);
      return;
    }

    if (showCustomNicheInput) {
      onChange({ niches: data.niches.filter((item) => item !== OTHER_NICHE && NICHES.includes(item)) });
    } else {
      onChange({ niches: [...data.niches, OTHER_NICHE] });
    }
  };

  const updateCustomNiche = (value: string) => {
    const selectedPresetNiches = data.niches.filter((niche) => niche !== OTHER_NICHE && NICHES.includes(niche));
    onChange({ niches: value.trim() ? [...selectedPresetNiches, value] : [...selectedPresetNiches, OTHER_NICHE] });
  };

  const toggleItem = (category: "niches" | "attributes", item: string) => {
    const current = data[category];
    if (current.includes(item)) {
      onChange({ [category]: current.filter((i) => i !== item) });
    } else {
      onChange({ [category]: [...current, item] });
    }
  };

  const TagButton = ({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 text-xs tracking-wide transition-all duration-200 border ${
        selected
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-card"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 className="font-display text-3xl text-foreground mb-2">
        Get Discovered
      </h2>
      <p className="text-muted-foreground text-sm mb-8">
        Tell us about yourself so we can connect you with the right opportunities.
      </p>

      <div className="space-y-8">
        {/* Location */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 block">Location <span className="text-destructive normal-case tracking-normal">*</span></span>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((location) => (
              <TagButton
                key={location}
                label={location}
                selected={data.locations.includes(location)}
                onClick={() => selectLocation(location)}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Niches */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 block">Niche <span className="text-destructive normal-case tracking-normal">*</span></span>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((niche) => (
              <TagButton
                key={niche}
                label={niche}
                selected={niche === OTHER_NICHE ? showCustomNicheInput : data.niches.includes(niche)}
                onClick={() => toggleNiche(niche)}
              />
            ))}
          </div>
          {showCustomNicheInput && (
            <Input
              placeholder="Type your niche"
              value={customNiche}
              onChange={(e) => updateCustomNiche(e.target.value)}
              className="mt-4 border-0 border-b border-border rounded-none bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-foreground transition-colors"
            />
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Attributes */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 block">Describes You</span>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTES.map((attr) => (
              <TagButton
                key={attr}
                label={attr}
                selected={data.attributes.includes(attr)}
                onClick={() => toggleItem("attributes", attr)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
