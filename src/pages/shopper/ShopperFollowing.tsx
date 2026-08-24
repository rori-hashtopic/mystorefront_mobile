import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserMinus, ExternalLink, Users } from "lucide-react";
import { useShopperData } from "@/hooks/useShopperData";
import { useToast } from "@/hooks/use-toast";


export default function ShopperFollowing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { profile } = useProfile();
  const { follows, loading, unfollowCreator } = useShopperData();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Allow shoppers, admins, and creators to access following page
  useEffect(() => {
    if (!roleLoading && role && role !== "shopper" && role !== "admin" && role !== "creator") {
      if (role === "brand") navigate("/brand");
    }
  }, [role, roleLoading, navigate]);

  const handleUnfollow = async (creatorId: string) => {
    const { error } = await unfollowCreator(creatorId);
    if (error) {
      toast({
        title: "Error",
        description: "Could not unfollow creator",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Unfollowed",
        description: "You've unfollowed this creator",
      });
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ShopperLayout displayName={profile?.display_name || undefined}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Following
          </h1>
          <p className="text-muted-foreground">
            Creators you follow • {follows.length} total
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : follows.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No creators followed yet</h3>
              <p className="text-muted-foreground mb-4">
                Discover and follow creators to see their latest picks
              </p>
              <Button asChild>
                <Link to="/discover">Discover Creators</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {follows.map((follow) => (
              <Card key={follow.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={follow.profile?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {follow.profile?.display_name?.[0] || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {follow.profile?.display_name || "Creator"}
                      </h3>
                      {follow.profile?.username && (
                        <p className="text-sm text-muted-foreground">@{follow.profile.username}</p>
                      )}
                    </div>
                  </div>
                  
                  {follow.profile?.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {follow.profile.bio}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    {follow.profile?.username ? (
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/${follow.profile.username}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Shop
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        No Shop
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleUnfollow(follow.creator_id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        
      </div>
    </ShopperLayout>
  );
}
