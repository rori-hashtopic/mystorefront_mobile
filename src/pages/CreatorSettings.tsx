import { useEffect, useState, useRef } from "react";

import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import { useSocialConnections } from "@/hooks/useSocialConnections";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/friendlyErrors";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Save, Eye, Mail, Camera, MapPin, Tag, Landmark } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SocialConnectCard } from "@/components/settings/SocialConnectCard";

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
  "Outside South Africa",
];

const NICHE_OPTIONS = [
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
  "Lifestyle",
  "Tech",
  "Food",
  "Parenting",
  "Finance",
  "Gaming",
  "Music",
  "Art",
  "Books",
  "Other",
];

const ATTRIBUTE_OPTIONS = [
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

export default function CreatorSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const {
    instagramConnection,
    tiktokConnection,
    loading: connectionsLoading,
    isSyncing,
    connectInstagram,
    connectTikTok,
    disconnectInstagram,
    disconnectTikTok,
    refreshInstagram,
    refreshTikTok,
    refetch: refetchConnections,
  } = useSocialConnections();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [province, setProvince] = useState("");
  const [nicheTags, setNicheTags] = useState<string[]>([]);
  const [attributeTags, setAttributeTags] = useState<string[]>([]);
  const [savedInstagramHandle, setSavedInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramConnectedFlag, setInstagramConnectedFlag] = useState(false);
  const [tiktokConnectedFlag, setTiktokConnectedFlag] = useState(false);

  // Bank details state
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  /** Last 4 digits already on file, shown as a hint. The input itself stays empty. */
  const [savedMask, setSavedMask] = useState("");
  const [bankSaving, setBankSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || (profile.display_name || "").toLowerCase().replace(/[^a-z0-9_]/g, ""));
      setBio(profile.bio || "");
      setPhotoUrl(profile.photo_url || "");
      setIsDiscoverable(profile.is_discoverable ?? true);
      setMarketingConsent((profile as any).marketing_consent ?? false);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("creator_socials")
        .select("instagram_handle, instagram_connected, tiktok_handle, tiktok_connected, youtube_url, other_urls")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading creator social links:", error);
        return;
      }

      setSavedInstagramHandle(data?.instagram_handle || "");
      setInstagramConnectedFlag(data?.instagram_connected || false);
      setTiktokHandle(data?.tiktok_handle || "");
      setTiktokConnectedFlag(data?.tiktok_connected || false);
      setYoutubeUrl(data?.youtube_url || "");
      setWebsiteUrl(data?.other_urls?.find((url) => url?.trim()) || "");
    })();
  }, [user]);

  // Load creator_tags (location, niches, attributes — set during onboarding)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("creator_tags")
        .select("locations, niches, attributes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading creator tags:", error);
        return;
      }

      if (data) {
        setProvince(data.locations?.[0] || "");
        setNicheTags(data.niches || []);
        setAttributeTags(data.attributes || []);
      } else {
        // Fall back to profile columns for legacy data
        setProvince(profile?.location_tags?.[0] || "");
        setNicheTags(profile?.niche_tags || []);
      }
    })();
  }, [user, profile]);

  // Load existing bank details
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("payout_accounts")
        .select("bank_name, account_holder, account_number_masked")
        .eq("user_id", user.id)
        .eq("type", "EFT")
        .maybeSingle();
      if (data) {
        setBankName((data as any).bank_name || "");
        setAccountHolder((data as any).account_holder || "");
        // Deliberately NOT prefilled with the mask. The field now feeds a real
        // account number into encrypted storage, so seeding it with "•••• 1234"
        // would mean a creator who saves without retyping submits the mask as
        // their number. Kept separately so the UI can show what's on file.
        setAccountNumber("");
        setSavedMask((data as any).account_number_masked || "");
      }
    })();
  }, [user]);

  const handleSaveBankDetails = async () => {
    if (!user) return;
    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      toast({
        title: "Missing fields",
        description:
          "Please fill in all bank detail fields. Your account number is stored encrypted, so it can't be pre-filled — retype it to save.",
        variant: "destructive",
      });
      return;
    }
    setBankSaving(true);
    try {
      // This screen used to write payout_accounts directly, masking the number
      // in the browser and never storing the real one. That made it a second,
      // divergent way to save bank details: a creator who linked via Earnings
      // and then corrected their number here left a NEW mask sitting over the
      // OLD encrypted number, so an admin would reveal a perfectly valid number
      // for the wrong bank account and pay it.
      //
      // Both screens now go through the same RPC, which writes the row and the
      // encrypted number together. The database refuses direct writes to those
      // columns, so this cannot drift again.
      const { error } = await supabase.rpc("save_eft_payout_account" as any, {
        p_bank_name: bankName.trim(),
        p_account_holder: accountHolder.trim(),
        // This screen doesn't collect these; the RPC coalesces nulls so a value
        // set on the Earnings screen is preserved rather than wiped.
        p_account_type: null,
        p_branch_code: null,
        p_account_number: accountNumber.trim(),
      });
      if (error) throw error;

      const masked =
        "•••• " +
        accountNumber
          .trim()
          .replace(/[^0-9]/g, "")
          .slice(-4);
      setAccountNumber(masked);
      toast({ title: "Bank details saved", description: "Your banking information has been updated." });
    } catch (error: any) {
      toast({ title: "Couldn't save bank details", description: friendlyErrorMessage(error), variant: "destructive" });
    } finally {
      setBankSaving(false);
    }
  };

  // Handle Instagram OAuth redirect params
  useEffect(() => {
    const igConnected = searchParams.get("instagram_connected");
    const igError = searchParams.get("instagram_error");

    if (igConnected === "true") {
      setSearchParams({}, { replace: true });
      toast({
        title: "Instagram Connected!",
        description: "Your Instagram account has been successfully linked.",
      });
      const timer = setTimeout(() => {
        refetchConnections();
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (igError) {
      setSearchParams({}, { replace: true });
      toast({
        title: "Instagram Connection Failed",
        description: igError.replace(/_/g, " "),
        variant: "destructive",
      });
    }
  }, [searchParams, setSearchParams, refetchConnections, toast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setPhotoUrl(urlWithCacheBust);

      toast({ title: "Photo uploaded", description: "Remember to save your profile." });
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

  const toggleNicheTag = (tag: string) => {
    setNicheTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleAttributeTag = (tag: string) => {
    setAttributeTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          bio,
          photo_url: photoUrl,
          is_discoverable: isDiscoverable,
          location_tags: province ? [province] : [],
          niche_tags: nicheTags,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Keep creator_tags in sync (source of truth for onboarding data)
      const { error: tagsError } = await supabase.from("creator_tags").upsert(
        {
          user_id: user.id,
          locations: province ? [province] : [],
          niches: nicheTags,
          attributes: attributeTags,
        },
        { onConflict: "user_id" },
      );
      if (tagsError) throw tagsError;

      const connectedInstagramHandle = instagramConnection?.username || savedInstagramHandle;
      const { error: socialsError } = await supabase.from("creator_socials").upsert(
        {
          user_id: user.id,
          instagram_handle: connectedInstagramHandle.trim() || null,
          instagram_connected: instagramConnection?.status === "connected" || instagramConnectedFlag,
          tiktok_handle: tiktokHandle.trim() || null,
          tiktok_connected: tiktokConnection?.status === "connected" || tiktokConnectedFlag,
          youtube_url: youtubeUrl.trim() || null,
          other_urls: websiteUrl.trim() ? [websiteUrl.trim()] : [],
        },
        { onConflict: "user_id" },
      );

      if (socialsError) throw socialsError;

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      });
      navigate("/shop");
    } catch (error: any) {
      toast({
        title: "Couldn't save profile",
        description: friendlyErrorMessage(error, "Failed to save profile. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectInstagram = async () => {
    setIsConnectingInstagram(true);
    await connectInstagram();
    setIsConnectingInstagram(false);
  };

  const handleConnectTikTok = async () => {
    setIsConnectingTikTok(true);
    await connectTikTok();
    setIsConnectingTikTok(false);
  };

  if (authLoading || profileLoading || connectionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Onboarding guard: a creator who hasn't finished the setup wizard should
  // never land on settings (e.g. via an OAuth return). Bounce them back to
  // /shop, which re-renders the wizard at their saved onboarding_step.
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/shop" replace />;
  }

  const instagramData = instagramConnection
    ? {
        id: instagramConnection.id,
        username: instagramConnection.username,
        followerCount: instagramConnection.follower_count,
        followingCount: instagramConnection.following_count,
        profilePictureUrl: instagramConnection.profile_picture_url,
        lastSyncAt: instagramConnection.last_sync_at,
        status: instagramConnection.status,
        syncError: instagramConnection.sync_error,
      }
    : null;

  const tiktokData = tiktokConnection
    ? {
        id: tiktokConnection.id,
        username: tiktokConnection.username,
        displayName: tiktokConnection.display_name,
        followerCount: tiktokConnection.follower_count,
        followingCount: tiktokConnection.following_count,
        profilePictureUrl: tiktokConnection.profile_picture_url,
        lastSyncAt: tiktokConnection.last_sync_at,
        status: tiktokConnection.status,
        syncError: tiktokConnection.sync_error,
        extraMetrics: [
          { label: "videos", value: tiktokConnection.video_count },
          { label: "likes", value: tiktokConnection.likes_count },
        ],
      }
    : null;

  return (
    <DashboardLayout
      tier={profile?.tier}
      displayName={profile?.display_name || undefined}
      instagramConnected={profile?.instagram_connected || false}
      tiktokConnected={profile?.tiktok_connected || false}
    >
      <div className="space-y-12 pb-12">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your storefront profile and preferences.</p>
        </div>

        {/* ─── SECTION 1: Profile & Identity ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Profile & Identity</h2>
            <div className="h-px bg-border mt-3" />
          </div>

          {/* Avatar */}
          <div className="flex items-start gap-5">
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoUrl || undefined} />
                <AvatarFallback className="text-2xl font-display">
                  {displayName?.[0]?.toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
            <div className="space-y-1.5 flex-1 pt-1">
              <Label className="text-sm">Profile Photo</Label>
              <p className="text-xs text-muted-foreground">Click the avatar to upload a photo.</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-sm">
              Display Name
            </Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Storefront Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm">
              Storefront Username
            </Label>
            <div className="flex items-center gap-0">
              <span className="inline-flex items-center h-10 px-3 rounded-l-xl border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                /
              </span>
              <Input
                id="username"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="rounded-l-none flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores.</p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-sm">
              Bio
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell visitors about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* Province */}
          <div className="space-y-1.5">
            <Label className="text-sm">Province</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger>
                <SelectValue placeholder="Select your province" />
              </SelectTrigger>
              <SelectContent>
                {SA_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ─── SECTION 2: Content & Discovery ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Content & Discovery
            </h2>
            <div className="h-px bg-border mt-3" />
          </div>

          {/* Niche Tags */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Niches</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Select categories that best describe your content.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleNicheTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    nicheTags.includes(tag)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Attribute Tags */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Describes You</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select tags that help brands understand who you are.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleAttributeTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    attributeTags.includes(tag)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: Social Links ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Social Links</h2>
            <div className="h-px bg-border mt-3" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tiktokHandle" className="text-sm">
                TikTok
              </Label>
              <Input
                id="tiktokHandle"
                placeholder="@yourhandle"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="youtubeUrl" className="text-sm">
                YouTube
              </Label>
              <Input
                id="youtubeUrl"
                placeholder="https://youtube.com/@yourchannel"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="websiteUrl" className="text-sm">
                Website or Other Link
              </Label>
              <Input
                id="websiteUrl"
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: Connected Accounts ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Connected Accounts</h2>
            <div className="h-px bg-border mt-3" />
          </div>

          <SocialConnectCard
            platform="instagram"
            connection={instagramData}
            isConnecting={isConnectingInstagram}
            isSyncing={isSyncing.instagram}
            onConnect={handleConnectInstagram}
            onDisconnect={disconnectInstagram}
            onRefresh={refreshInstagram}
          />

          <SocialConnectCard
            platform="tiktok"
            connection={tiktokData}
            isConnecting={isConnectingTikTok}
            isSyncing={isSyncing.tiktok}
            onConnect={handleConnectTikTok}
            onDisconnect={disconnectTikTok}
            onRefresh={refreshTikTok}
            collapsed
          />
        </section>

        {/* ─── SECTION: Bank Details ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Bank Details</h2>
            <div className="h-px bg-border mt-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            Your bank details are used for EFT payouts only and will never be used to debit your account.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-sm">
                Bank Name
              </Label>
              <Input
                id="bankName"
                placeholder="e.g. FNB, Standard Bank, Capitec"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountHolder" className="text-sm">
                Account Holder Name
              </Label>
              <Input
                id="accountHolder"
                placeholder="Name as it appears on your bank account"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountNumber" className="text-sm">
                Account Number
              </Label>
              <Input
                id="accountNumber"
                placeholder={savedMask ? `Currently ${savedMask} — retype to change` : "Your bank account number"}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {savedMask
                  ? `We have ${savedMask} on file. Retype your full account number to save any change on this page.`
                  : "Stored encrypted and only visible to MyStorefront when a payout is being made."}
              </p>
            </div>

            <Button variant="outline" onClick={handleSaveBankDetails} disabled={bankSaving} className="text-sm">
              {bankSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Landmark className="h-4 w-4 mr-2" />
                  Save Bank Details
                </>
              )}
            </Button>
          </div>
        </section>

        {/* ─── SECTION 4: Preferences ─── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Preferences</h2>
            <div className="h-px bg-border mt-3" />
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="marketingConsent" className="text-sm font-medium">
                Email updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about your wishlist and new finds. You can unsubscribe at any time.
              </p>
            </div>
            <Switch
              id="marketingConsent"
              checked={marketingConsent}
              onCheckedChange={async (checked) => {
                setMarketingConsent(checked);
                try {
                  const { error } = await supabase
                    .from("profiles")
                    .update({
                      marketing_consent: checked,
                      marketing_consent_updated_at: checked ? new Date().toISOString() : undefined,
                    })
                    .eq("id", user.id);

                  if (error) throw error;

                  toast({
                    title: checked ? "Subscribed" : "Unsubscribed",
                    description: checked
                      ? "You'll receive updates about your wishlist and new finds."
                      : "You've been unsubscribed from marketing emails.",
                  });
                } catch (error: any) {
                  setMarketingConsent(!checked);
                  toast({
                    title: "Error",
                    description: "Failed to update preferences",
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>

          {/* Discoverability */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="discoverable" className="text-sm font-medium">
                Visible in Explore
              </Label>
              <p className="text-xs text-muted-foreground">
                Your products appear in the Explore feed for shoppers and other creators.
              </p>
            </div>
            <Switch id="discoverable" checked={isDiscoverable} onCheckedChange={setIsDiscoverable} />
          </div>
        </section>

        {/* Save Button */}
        <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}
