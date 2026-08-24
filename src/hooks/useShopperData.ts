import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface FollowedCreator {
  id: string;
  creator_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    photo_url: string | null;
    username: string | null;
    bio: string | null;
  };
}

interface WishlistItem {
  id: string;
  link_id: string;
  creator_id: string;
  created_at: string;
  link?: {
    product_title: string;
    product_image_url: string | null;
    affiliate_url: string;
    retailer: string | null;
  };
}

export function useShopperData() {
  const { user } = useAuth();
  const [follows, setFollows] = useState<FollowedCreator[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFollows([]);
      setWishlist([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch follows
      const { data: followsData } = await supabase
        .from("shopper_follows")
        .select("*")
        .eq("shopper_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch profiles for followed creators
      if (followsData && followsData.length > 0) {
        const creatorIds = followsData.map(f => f.creator_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url, username, bio")
          .in("id", creatorIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        setFollows(followsData.map(f => ({
          ...f,
          profile: profilesMap.get(f.creator_id)
        })));
      } else {
        setFollows([]);
      }

      // Fetch wishlist
      const { data: wishlistData } = await supabase
        .from("shopper_wishlists")
        .select("*")
        .eq("shopper_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch links for wishlist items
      if (wishlistData && wishlistData.length > 0) {
        const linkIds = wishlistData.map(w => w.link_id);
        const { data: linksData } = await supabase
          .from("links")
          .select("id, product_title, product_image_url, affiliate_url, retailer")
          .in("id", linkIds);

        const linksMap = new Map(linksData?.map(l => [l.id, l]) || []);
        
        setWishlist(wishlistData.map(w => ({
          ...w,
          link: linksMap.get(w.link_id)
        })));
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error("Error fetching shopper data:", error);
    } finally {
      setLoading(false);
    }
  };

  const followCreator = async (creatorId: string) => {
    if (!user) return { error: new Error("Not logged in") };

    const { error } = await supabase
      .from("shopper_follows")
      .insert({
        shopper_id: user.id,
        creator_id: creatorId,
      });

    if (!error) {
      // Log activity
      await supabase.from("shopper_activity").insert({
        shopper_id: user.id,
        activity_type: "follow",
        creator_id: creatorId,
      });
      await fetchData();
    }

    return { error };
  };

  const unfollowCreator = async (creatorId: string) => {
    if (!user) return { error: new Error("Not logged in") };

    const { error } = await supabase
      .from("shopper_follows")
      .delete()
      .eq("shopper_id", user.id)
      .eq("creator_id", creatorId);

    if (!error) {
      await fetchData();
    }

    return { error };
  };

  const addToWishlist = async (linkId: string, creatorId: string) => {
    if (!user) return { error: new Error("Not logged in") };

    const { error } = await supabase
      .from("shopper_wishlists")
      .insert({
        shopper_id: user.id,
        link_id: linkId,
        creator_id: creatorId,
      });

    if (!error) {
      // Log activity
      await supabase.from("shopper_activity").insert({
        shopper_id: user.id,
        activity_type: "wishlist_add",
        link_id: linkId,
        creator_id: creatorId,
      });
      await fetchData();
    }

    return { error };
  };

  const removeFromWishlist = async (linkId: string) => {
    if (!user) return { error: new Error("Not logged in") };

    const { error } = await supabase
      .from("shopper_wishlists")
      .delete()
      .eq("shopper_id", user.id)
      .eq("link_id", linkId);

    if (!error) {
      await fetchData();
    }

    return { error };
  };

  const isFollowing = (creatorId: string) => {
    return follows.some(f => f.creator_id === creatorId);
  };

  const isInWishlist = (linkId: string) => {
    return wishlist.some(w => w.link_id === linkId);
  };

  return {
    follows,
    wishlist,
    loading,
    followCreator,
    unfollowCreator,
    addToWishlist,
    removeFromWishlist,
    isFollowing,
    isInWishlist,
    refetch: fetchData,
  };
}
