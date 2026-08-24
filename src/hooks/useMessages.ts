import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { detectOffPlatform, logModerationFlag, OFF_PLATFORM_WARNING } from "@/lib/moderation";

export type MessageType =
  | "text"
  | "brief"
  | "mention_request"
  | "gift_offer"
  | "discount_code"
  | "paid_collab"
  | "system";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  brief_data: BriefData | MentionRequestData | GiftOfferData | DiscountCodeData | null;
  is_read: boolean;
  created_at: string;
}

export type BriefStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "in_progress"
  | "content_ready"
  | "revision_needed"
  | "completed";

export interface BriefData {
  title: string;
  description: string;
  deliverables?: string;
  budget?: string;
  deadline?: string;
  status?: BriefStatus;
  progress_note?: string;
  status_updated_at?: string;
}

export type MentionRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "content_submitted"
  | "revision_requested"
  | "approved"
  | "paid"
  | "cancelled";

export interface MentionRequestData {
  campaign_id?: string;
  campaign_title: string;
  deliverable_type: string;
  deliverable_description?: string;
  fee_amount: number;
  content_deadline?: string;
  revision_rounds?: number;
  status: MentionRequestStatus;
  mention_request_id?: string; // linked mention_requests row
  post_url?: string;
  status_updated_at?: string;
  brand_note?: string;
}

export type GiftOfferStatus = "pending" | "accepted" | "declined" | "shipped" | "delivered" | "posted";

export interface GiftOfferData {
  campaign_id?: string;
  campaign_title: string;
  product_name: string;
  product_image_url?: string;
  product_value?: number;
  description?: string;
  status: GiftOfferStatus;
  gift_request_id?: string; // linked gift_requests row
  shipping_address?: string;
  tracking_number?: string;
  creator_post_url?: string;
  status_updated_at?: string;
}

export interface DiscountCodeData {
  code: string;
  discount_type: string;
  discount_value: number;
  expiry_date?: string;
  notes?: string;
  discount_code_id?: string; // linked discount_codes row
  status: "assigned" | "acknowledged";
  status_updated_at?: string;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  // The realtime handler runs inside a subscription created once per
  // conversation, so it must not read `messages` directly — that closure goes
  // stale after the first render.
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Message rows are updated by whoever is acting on the card, not only by the
  // original sender, so sender_id can't tell us who made a change. Record our
  // own writes here and skip the realtime toast for them — otherwise the actor
  // gets a "status changed" toast on top of the confirmation they already saw.
  const selfUpdatedRef = useRef<Record<string, number>>({});
  const markSelfUpdate = (messageId: string) => {
    selfUpdatedRef.current[messageId] = Date.now();
  };
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as unknown as Message[]);
    }
    setLoading(false);

    // Mark unread messages as read
    if (user && data) {
      const unreadIds = data.filter((m: any) => !m.is_read && m.sender_id !== user.id).map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ is_read: true }).in("id", unreadIds);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId, user]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as unknown as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (user && newMsg.sender_id !== user.id) {
              supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as unknown as Message;
            const oldMsg = messagesRef.current.find((m) => m.id === updated.id);
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

            // Did this client make the change? Entries are short-lived so a
            // genuine update from the other party later still toasts.
            const selfUpdatedAt = selfUpdatedRef.current[updated.id];
            const isSelfUpdate = selfUpdatedAt != null && Date.now() - selfUpdatedAt < 15000;
            if (selfUpdatedAt != null) delete selfUpdatedRef.current[updated.id];

            // Show toast for status changes on interactive cards (skip paid_collab — it has its own toasts)
            if (
              !isSelfUpdate &&
              oldMsg &&
              updated.brief_data &&
              oldMsg.brief_data &&
              updated.sender_id !== user?.id &&
              updated.message_type !== "paid_collab"
            ) {
              const oldData = oldMsg.brief_data as any;
              const newData = updated.brief_data as any;
              if (oldData.status && newData.status && oldData.status !== newData.status) {
                const label =
                  updated.message_type === "gift_offer"
                    ? "Gift Offer"
                    : updated.message_type === "mention_request"
                      ? "Mention Request"
                      : updated.message_type === "discount_code"
                        ? "Discount Code"
                        : updated.message_type === "brief"
                          ? "Brief"
                          : "Request";
                const title = newData.campaign_title || newData.product_name || newData.code || newData.title || "";
                // Keyed by message so rapid changes on the same card replace
                // the previous toast instead of stacking up.
                toast.info(`${label} updated`, {
                  id: `brief-status-${updated.id}`,
                  description: `${title ? title + ": " : ""}Status changed to ${newData.status.replace(/_/g, " ")}`,
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string, messageType: MessageType = "text", briefData?: any) => {
    if (!conversationId || !user) return { error: "Not ready" as string };

    // Off-platform dealing moderation: scan content + any free-text fields
    // in the structured payload so brief/mention/gift composers are covered too.
    // System notifications are platform-generated, so skip moderation.
    if (messageType !== "system") {
      const briefText = briefData
        ? Object.values(briefData)
            .filter((v) => typeof v === "string")
            .join(" \n ")
        : "";
      const moderation = detectOffPlatform(content, briefText);
      if (moderation.flagged) {
        await logModerationFlag({
          userId: user.id,
          content: [content, briefText].filter(Boolean).join("\n---\n"),
          matchedPhrase: moderation.matchedPhrase!,
          conversationId,
          context: messageType === "text" ? "chat" : messageType,
        });
        return {
          error: OFF_PLATFORM_WARNING,
          flagged: true as const,
          matchedPhrase: moderation.matchedPhrase,
        };
      }
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        brief_data: briefData || null,
      })
      .select()
      .single();

    if (!error && data) {
      // Optimistically add to local state so the sender sees it immediately
      // (realtime INSERT event will arrive later but is deduped by id).
      const newMsg = data as unknown as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

      // Send email notification to the other party (fire-and-forget)
      if (messageType === "text") {
        (async () => {
          try {
            // Look up conversation to find brand_id and creator_id
            const { data: convo } = await supabase
              .from("conversations")
              .select("brand_id, creator_id")
              .eq("id", conversationId)
              .single();
            if (!convo) return;

            const isSenderBrand = user.id !== convo.creator_id;
            const recipientUserId = isSenderBrand ? convo.creator_id : undefined;
            const recipientRole = isSenderBrand ? "creator" : "brand";

            // Get sender display name
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", user.id)
              .single();

            // If sender is creator, get brand name instead of resolving brand owner
            let senderName = senderProfile?.display_name || senderProfile?.username || "Someone";
            let resolvedRecipientUserId = recipientUserId;

            if (isSenderBrand) {
              // Sender is brand — use brand name for the email
              const { data: brandRow } = await supabase
                .from("brand_accounts")
                .select("name")
                .eq("id", convo.brand_id)
                .single();
              if (brandRow?.name) senderName = brandRow.name;
            } else {
              // Sender is creator — look up brand owner's user ID
              const { data: brandRow } = await supabase
                .from("brand_accounts")
                .select("owner_user_id")
                .eq("id", convo.brand_id)
                .single();
              if (brandRow?.owner_user_id) {
                resolvedRecipientUserId = brandRow.owner_user_id;
              } else {
                return; // Can't resolve brand owner
              }
            }

            // Truncate preview to 150 chars
            const messagePreview = content.length > 150 ? content.slice(0, 147) + "..." : content;

            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "new-message",
                recipientUserId: resolvedRecipientUserId,
                templateData: {
                  senderName,
                  messagePreview,
                  recipientRole,
                },
              },
            });
          } catch (emailErr) {
            console.error("Failed to send new message notification", emailErr);
          }
        })();
      }
    }

    return { error: error?.message ?? null };
  };

  const updateBriefStatus = async (messageId: string, status: BriefStatus, progressNote?: string) => {
    const msg = messages.find((m) => m.id === messageId);
    // Return the same shape as every other exit so callers can check one thing.
    if (!msg || !msg.brief_data) return { error: { message: "Message not found" } as any };

    const updatedBrief: BriefData = {
      ...(msg.brief_data as BriefData),
      status,
      progress_note: progressNote || (msg.brief_data as BriefData).progress_note,
      status_updated_at: new Date().toISOString(),
    };

    markSelfUpdate(messageId);
    // Same reasoning as updateMessageData below — see the note there.
    const { data: rows, error } = await supabase
      .from("messages")
      .update({ brief_data: updatedBrief as any })
      .eq("id", messageId)
      .select("id");

    const failure = error
      ? error
      : !rows || rows.length === 0
        ? ({
            message: "The update did not apply. You may not have permission, or this message no longer exists.",
          } as any)
        : null;

    if (!failure) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, brief_data: updatedBrief } : m)));
    }

    return { error: failure };
  };

  const updateMessageData = async (messageId: string, data: any) => {
    markSelfUpdate(messageId);
    // .select("id") is load-bearing: an update blocked by RLS, or one that
    // matches no row, returns error === null. Without asking for the row back,
    // "no error" does not mean "the row changed" — which is how accepted
    // collabs, system messages and notification emails were being announced for
    // writes that never happened.
    const { data: rows, error } = await supabase
      .from("messages")
      .update({ brief_data: data })
      .eq("id", messageId)
      .select("id");

    const failure = error
      ? error
      : !rows || rows.length === 0
        ? ({
            message: "The update did not apply. You may not have permission, or this message no longer exists.",
          } as any)
        : null;

    if (!failure) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, brief_data: data } : m)));
    }

    // Shape is unchanged on purpose. Callers destructure { error } and three of
    // the four message cards call setUpdating(false) after an unguarded await —
    // making this THROW would leave them spinning forever.
    return { error: failure };
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    return { error };
  };

  return {
    messages,
    loading,
    sendMessage,
    updateBriefStatus,
    updateMessageData,
    deleteMessage,
    refetch: fetchMessages,
  };
}
