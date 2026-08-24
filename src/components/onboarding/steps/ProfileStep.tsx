import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/friendlyErrors";

interface ProfileStepProps {
  data: {
    displayName: string;
    bio: string;
    photoUrl: string;
  };
  onChange: (data: Partial<ProfileStepProps["data"]>) => void;
}

export function ProfileStep({ data, onChange }: ProfileStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in again before uploading a photo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      onChange({ photoUrl: `${publicUrl}?t=${Date.now()}` });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: friendlyErrorMessage(error, "We couldn't upload your photo. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <h2 className="font-display text-3xl text-foreground mb-2">
        Tell Us About Yourself
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Help your storefront visitors get to know you.
      </p>

      <div className="space-y-6">
        {/* Photo upload — editorial circle */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={isUploading}
            className="relative w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-foreground transition-colors overflow-hidden group flex-shrink-0 disabled:opacity-70"
          >
            {data.photoUrl ? (
              <img
                src={data.photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <User className="h-6 w-6" />
              </div>
            )}
            <div className={`absolute inset-0 bg-foreground/50 flex items-center justify-center transition-opacity ${isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-background animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-background" />
              )}
            </div>
          </button>
          <div>
            <p className="text-sm text-foreground font-medium">Profile Photo <span className="text-destructive">*</span></p>
            {isUploading ? (
              <p className="text-xs text-muted-foreground mt-0.5">Uploading…</p>
            ) : data.photoUrl ? (
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={handlePhotoClick} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                  Change photo
                </button>
                <button type="button" onClick={() => onChange({ photoUrl: "" })} className="text-xs text-destructive/70 hover:text-destructive transition-colors underline underline-offset-2">
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Click to upload</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="h-px bg-border" />

        {/* Display name */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Display Name</span>
          <p className="text-foreground font-medium">{data.displayName || "Your Name"}</p>
        </div>

        <div className="h-px bg-border" />

        {/* Bio */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Bio <span className="text-destructive normal-case tracking-normal">*</span></span>
          <Textarea
            placeholder="Tell your storefront visitors about yourself..."
            value={data.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            className="border-0 border-b border-border rounded-none bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-foreground transition-colors min-h-[100px] resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right mt-2 tracking-wide">
            {data.bio.length} / 500
          </p>
        </div>
      </div>
    </div>
  );
}
