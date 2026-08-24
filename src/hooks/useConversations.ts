import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Conversation {
  id: string;
  brand_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  archived_by_brand?: boolean;
  // Joined data
  brand_name?: string;
  brand_logo?: string;
  creator_name?: string;
  creator_photo?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export function useConversationActions() {
  const archiveConversation = async (conversationId: string) => {
    const { error } = await supabase.from("conversations").update({ archived_by_brand: true }).eq("id", conversationId);
    return { error };
  };

  const unarchiveConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ archived_by_brand: false })
      .eq("id", conversationId);
    return { error };
  };

  const deleteConversation = async (conversationId: string) => {
    // Delete all messages first, then the conversation
    await supabase.from("messages").delete().eq("conversation_id", conversationId);
    const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
    return { error };
  };

  return { archiveConversation, unarchiveConversation, deleteConversation };
}

export function useConversations(viewAs: "brand" | "creator") {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: convos, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error || !convos) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    // Enrich with brand/creator info and last message
    const enriched = await Promise.all(
      convos.map(async (conv) => {
        // Get brand info
        const { data: brand } = await supabase
          .from("brand_accounts")
          .select("name, logo_url, logo_upload_url")
          .eq("id", conv.brand_id)
          .maybeSingle();

        // Get creator info
        const { data: creator } = await supabase
          .from("profiles")
          .select("display_name, photo_url")
          .eq("id", conv.creator_id)
          .maybeSingle();

        // Get last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at, message_type")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        return {
          ...conv,
          brand_name: brand?.name || "Unknown Brand",
          brand_logo: brand?.logo_upload_url || brand?.logo_url || null,
          creator_name: creator?.display_name || "Creator",
          creator_photo: creator?.photo_url || null,
          _hasCreatorProfile: !!creator,
          last_message:
            lastMsg?.message_type === "brief"
              ? "📋 Promotional Brief"
              : lastMsg?.message_type === "paid_collab"
                ? "🤝 Paid Collab offer"
                : lastMsg?.message_type === "gift_offer"
                  ? "🎁 Gift offer"
                  : lastMsg?.message_type === "mention_request"
                    ? "📢 Mention request"
                    : lastMsg?.message_type === "discount_code"
                      ? "🏷️ Discount code"
                      : lastMsg?.message_type === "gift_request"
                        ? null
                        : lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || conv.created_at,
          unread_count: count || 0,
        } as Conversation;
      }),
    );

    setConversations(enriched.filter((c: any) => c._hasCreatorProfile !== false));
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations };
}
