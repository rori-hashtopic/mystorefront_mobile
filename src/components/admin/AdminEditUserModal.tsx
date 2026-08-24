import { useState, useEffect } from "react";
import { Loader2, ArrowRight, X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
  "Outside South Africa",
];

const NICHES = [
  "Fashion",
  "Beauty",
  "Skincare",
  "Wellness",
  "Fitness",
  "Home",
  "Menswear",
  "Cooking",
  "Family",
  "Sports",
  "Travel",
  "Other",
];

const ATTRIBUTES = [
  "Podcast Host",
  "Dermatologist",
  "Model",
  "Stylist",
  "Lifestyle Influencer",
  "Athlete",
  "Makeup Artist",
  "Photographer",
  "Fashion Blogger",
  "Fitness Trainer",
  "Chef",
  "Interior Designer",
];

interface AdminEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onSaved: () => void;
}

export function AdminEditUserModal({ isOpen, onClose, userId, onSaved }: AdminEditUserModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [nicheTags, setNicheTags] = useState<string[]>([]);
  const [attributeTags, setAttributeTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && userId) {
      setLoadingProfile(true);
      Promise.all([
        supabase.rpc("get_profile_admin", { _user_id: userId }).maybeSingle(),
        supabase.from("creator_tags").select("locations,niches,attributes").eq("user_id", userId).maybeSingle(),
      ]).then(([profileRes, tagsRes]) => {
        if (profileRes.data) {
          setDisplayName(profileRes.data.display_name || "");
          setBio(profileRes.data.bio || "");
          setPhotoUrl(profileRes.data.photo_url);
          setEmail(profileRes.data.email || "");
          setLocationTags(profileRes.data.location_tags || []);
        }
        if (tagsRes.data) {
          setNicheTags(tagsRes.data.niches || []);
          setAttributeTags(tagsRes.data.attributes || []);
        } else {
          setNicheTags([]);
          setAttributeTags([]);
        }
        setLoadingProfile(false);
      });
    }
  }, [isOpen, userId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported format",
        description: "Please upload a JPG, PNG, WebP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl + `?t=${Date.now()}`);
      toast({ title: "Photo uploaded!" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          photo_url: photoUrl,
          location_tags: locationTags.length > 0 ? locationTags : null,
        })
        .eq("id", userId);

      if (error) throw error;

      // Upsert creator_tags
      const { error: tagsError } = await supabase.from("creator_tags").upsert(
        {
          user_id: userId,
          locations: locationTags,
          niches: nicheTags.length > 0 ? nicheTags : null,
          attributes: attributeTags.length > 0 ? attributeTags : null,
        },
        { onConflict: "user_id" },
      );

      if (tagsError) throw tagsError;

      toast({ title: "Profile updated!" });
      onSaved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</span>
            <DialogTitle asChild>
              <h2 className="font-display text-2xl sm:text-3xl mt-1">Edit User Profile</h2>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{email}</p>
            <div className="h-px bg-border mt-4" />
          </div>

          {loadingProfile ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 transition-all duration-500">
                  <AvatarImage src={photoUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-xl font-display bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors inline-flex items-center gap-1 group min-h-[44px] min-w-[44px] justify-center">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="group-hover:underline">Change Photo</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="h-px bg-border" />

              {/* Display Name */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Display Name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full bg-transparent border-0 border-b border-border focus:border-foreground py-2 text-base outline-none transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="User bio..."
                  rows={3}
                  className="w-full bg-transparent border-0 border-b border-border focus:border-foreground py-2 text-base outline-none transition-colors resize-none placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Location - Radio Buttons */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location / Province</span>
                <RadioGroup
                  value={locationTags[0] || ""}
                  onValueChange={(val) => setLocationTags([val])}
                  className="grid grid-cols-2 gap-2"
                >
                  {PROVINCES.map((province) => (
                    <div key={province} className="flex items-center space-x-2">
                      <RadioGroupItem value={province} id={`province-${province}`} />
                      <Label htmlFor={`province-${province}`} className="text-sm cursor-pointer">
                        {province}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="h-px bg-border" />

              {/* Niche Tags */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Niche</span>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((niche) => (
                    <button
                      key={niche}
                      type="button"
                      onClick={() =>
                        setNicheTags((prev) =>
                          prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche],
                        )
                      }
                      className={`px-3 py-1.5 text-xs tracking-wide transition-all duration-200 border ${
                        nicheTags.includes(niche)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-card"
                      }`}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Attribute Tags */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Describes Them</span>
                <div className="flex flex-wrap gap-2">
                  {ATTRIBUTES.map((attr) => (
                    <button
                      key={attr}
                      type="button"
                      onClick={() =>
                        setAttributeTags((prev) =>
                          prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr],
                        )
                      }
                      className={`px-3 py-1.5 text-xs tracking-wide transition-all duration-200 border ${
                        attributeTags.includes(attr)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-card"
                      }`}
                    >
                      {attr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Photo URL */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Photo URL (manual)</span>
                <input
                  type="text"
                  value={photoUrl || ""}
                  onChange={(e) => setPhotoUrl(e.target.value || null)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-transparent border-0 border-b border-border focus:border-foreground py-2 text-base outline-none transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Actions */}
              <div className="pt-6">
                <div className="h-px bg-border mb-6" />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-sm font-medium inline-flex items-center gap-1 hover:underline underline-offset-4 transition-all min-h-[44px] px-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Changes
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
