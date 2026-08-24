import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingModal } from "./OnboardingModal";
import { WelcomeStep } from "./steps/WelcomeStep";
import { SocialsStep } from "./steps/SocialsStep";
import { ProfileStep } from "./steps/ProfileStep";
import { TagsStep } from "./steps/TagsStep";
import { TiersStep } from "./steps/TiersStep";

interface OnboardingWizardProps {
  userId: string;
  displayName: string;
  initialStep?: number;
  onComplete: () => void;
}

export function OnboardingWizard({
  userId,
  displayName,
  initialStep = 0,
  onComplete,
}: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);

  const [socialsData, setSocialsData] = useState({
    instagramHandle: "",
    instagramConnected: false,
    tiktokHandle: "",
    tiktokConnected: false,
    youtubeUrl: "",
    otherUrls: "",
  });

  const [profileData, setProfileData] = useState({
    displayName: displayName,
    bio: "",
    photoUrl: "",
  });

  const [tagsData, setTagsData] = useState({
    locations: [] as string[],
    niches: [] as string[],
    attributes: [] as string[],
  });

  const [marketingConsent, setMarketingConsent] = useState(true);
  const [tosAccepted, setTosAccepted] = useState(false);

  const totalSteps = 5;

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveProgress = async (step: number) => {
    try {
      await supabase.from("profiles").update({ onboarding_step: step }).eq("id", userId);
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = async () => {
    if (currentStep === 4 && !tosAccepted) {
      toast({
        title: "Please confirm",
        description: "You must agree to the Terms of Service to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (currentStep === 1) {
        const { error } = await supabase.from("creator_socials").upsert(
          {
            user_id: userId,
            instagram_handle: socialsData.instagramHandle,
            instagram_connected: socialsData.instagramConnected,
            tiktok_handle: socialsData.tiktokHandle,
            tiktok_connected: socialsData.tiktokConnected,
            youtube_url: socialsData.youtubeUrl,
            other_urls: socialsData.otherUrls ? [socialsData.otherUrls] : [],
          },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }

      if (currentStep === 2) {
        const { error } = await supabase
          .from("profiles")
          .update({ bio: profileData.bio, photo_url: profileData.photoUrl })
          .eq("id", userId);
        if (error) throw error;
      }

      if (currentStep === 3) {
        const { error } = await supabase.from("creator_tags").upsert(
          {
            user_id: userId,
            locations: tagsData.locations,
            niches: tagsData.niches,
            attributes: tagsData.attributes,
          },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }

      if (currentStep === 4) {
        const { error } = await supabase
          .from("profiles")
          .update({ onboarding_completed: true, onboarding_step: 5 })
          .eq("id", userId);
        if (error) throw error;

        const { error: consentError } = await supabase
          .from("profiles")
          .update({
            marketing_consent: marketingConsent,
            marketing_consent_updated_at: marketingConsent ? new Date().toISOString() : null,
          })
          .eq("id", userId);
        if (consentError) console.error("Error saving marketing consent:", consentError);

        toast({ title: "You're all set!", description: "Welcome to MyStorefront." });
        onComplete();
        navigate("/shop");
        return;
      }

      await saveProgress(currentStep + 1);
      setCurrentStep(currentStep + 1);
    } catch (error: any) {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completedSteps = {
    bioAdded: profileData.bio.length > 0,
    socialLinked: socialsData.instagramConnected || socialsData.tiktokConnected,
    photoUploaded: profileData.photoUrl.length > 0,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep displayName={displayName} />;
      case 1:
        return <SocialsStep data={socialsData} onChange={(data) => setSocialsData((prev) => ({ ...prev, ...data }))} />;
      case 2:
        return <ProfileStep data={profileData} onChange={(data) => setProfileData((prev) => ({ ...prev, ...data }))} />;
      case 3:
        return <TagsStep data={tagsData} onChange={(data) => setTagsData((prev) => ({ ...prev, ...data }))} />;
      case 4:
        return (
          <TiersStep
            currentTier="enthusiast"
            completedSteps={completedSteps}
            marketingConsent={marketingConsent}
            onMarketingConsentChange={setMarketingConsent}
            tosAccepted={tosAccepted}
            onTosAcceptedChange={setTosAccepted}
          />
        );
      default:
        return null;
    }
  };

  const getNextLabel = () => {
    if (currentStep === 0) return "Let's Go";
    if (currentStep === 4) return "Finish";
    return "Next";
  };

  return (
    <OnboardingModal
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={currentStep > 0 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={getNextLabel()}
      isNextDisabled={currentStep === 4 && !tosAccepted}
      isLoading={isLoading}
      showClose={false}
    >
      {renderStep()}
    </OnboardingModal>
  );
}
