import { useUserRole } from "@/hooks/useUserRole";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import ShopperExploreContent from "./shopper/ShopperExploreContent";
import { Loader2 } from "lucide-react";

const ExploreRouter = () => {
  const { role, loading: roleLoading } = useUserRole();
  const { profile, loading: profileLoading } = useProfile();

  if (roleLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Creators and admins use DashboardLayout for Explore
  if (role === "creator" || role === "admin") {
    return (
      <DashboardLayout 
        tier={profile?.tier} 
        displayName={profile?.display_name || undefined}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      >
        <ShopperExploreContent />
      </DashboardLayout>
    );
  }

  // Shoppers and others use the full ShopperExplore with ShopperLayout
  return <ShopperExploreContent showLayout={true} />;
};

export default ExploreRouter;
