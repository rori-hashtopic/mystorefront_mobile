import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MessageRequest {
  id: string;
  creator_id: string;
  brand_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  // Enriched
  creator_name?: string;
  creator_photo?: string;
  creator_tier?: string;
  brand_name?: string;
  brand_logo?: string;
}

export function useMessageRequests(viewAs: "brand" | "creator") {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("message_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching message requests:", error);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      data.map(async (req: any) => {
        const { data: creator } = await supabase
          .from("profiles")
          .select("display_name, photo_url, tier")
          .eq("id", req.creator_id)
          .maybeSingle();

        const { data: brand } = await supabase
          .from("brand_accounts")
          .select("name, logo_url, logo_upload_url")
          .eq("id", req.brand_id)
          .maybeSingle();

        return {
          ...req,
          creator_name: creator?.display_name || "Creator",
          creator_photo: creator?.photo_url || null,
          creator_tier: creator?.tier || "enthusiast",
          brand_name: brand?.name || "Brand",
          brand_logo: brand?.logo_upload_url || brand?.logo_url || null,
        } as MessageRequest;
      })
    );

    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const sendRequest = async (brandId: string, message: string) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("message_requests")
      .insert({
        creator_id: user.id,
        brand_id: brandId,
        message,
      });

    if (error) return { error: error.message };
    await fetchRequests();
    return { error: null };
  };

  const respondToRequest = async (
    requestId: string,
    status: "accepted" | "declined",
    creatorId?: string,
    brandId?: string
  ) => {
    if (!user) return { error: "Not authenticated", conversationId: null };

    const { error } = await supabase
      .from("message_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) return { error: error.message, conversationId: null };

    // If accepted, create a conversation
    if (status === "accepted" && creatorId && brandId) {
      const { data: convo, error: convoError } = await supabase
        .from("conversations")
        .insert({ brand_id: brandId, creator_id: creatorId })
        .select()
        .single();

      if (convoError) return { error: convoError.message, conversationId: null };
      await fetchRequests();
      return { error: null, conversationId: convo?.id || null };
    }

    await fetchRequests();
    return { error: null, conversationId: null };
  };

  return { requests, loading, sendRequest, respondToRequest, refetch: fetchRequests };
}
