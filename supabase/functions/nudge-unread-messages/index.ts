import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Reminds a participant about messages they left unread for an hour or more.
// Runs on a schedule (pg_cron) with the service role — no user JWT.
const REPLY_EXPECTED_TYPES = ["text", "brief", "mention_request", "gift_offer", "discount_code", "paid_collab"];

const UNREAD_MINUTES = 60;
const PRESENCE_GRACE_MINUTES = 5;
const NUDGE_COOLDOWN_HOURS = 24;
const MAX_AGE_HOURS = 24; // don't nudge about very old, abandoned threads

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const now = Date.now();
  const cutoff = new Date(now - UNREAD_MINUTES * 60_000).toISOString();
  const floor = new Date(now - MAX_AGE_HOURS * 3_600_000).toISOString();

  try {
    // Unread, reply-expected messages in the eligible window.
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type, created_at")
      .eq("is_read", false)
      .in("message_type", REPLY_EXPECTED_TYPES)
      .lte("created_at", cutoff)
      .gte("created_at", floor)
      .order("created_at", { ascending: false });

    if (msgErr) throw msgErr;
    if (!msgs?.length) {
      return json({ processed: 0, sent: 0 });
    }

    // Group by conversation, newest first.
    const byConversation = new Map<string, typeof msgs>();
    for (const m of msgs) {
      const list = byConversation.get(m.conversation_id) ?? [];
      list.push(m);
      byConversation.set(m.conversation_id, list);
    }

    const conversationIds = [...byConversation.keys()];

    const { data: convos } = await supabase
      .from("conversations")
      .select("id, brand_id, creator_id")
      .in("id", conversationIds);

    const { data: states } = await supabase
      .from("conversation_participant_state")
      .select("conversation_id, user_id, last_seen_at, last_nudged_at")
      .in("conversation_id", conversationIds);

    const stateKey = (c: string, u: string) => `${c}:${u}`;
    const stateMap = new Map((states ?? []).map((s: any) => [stateKey(s.conversation_id, s.user_id), s]));

    const brandIds = [...new Set((convos ?? []).map((c: any) => c.brand_id))];
    const { data: brands } = await supabase
      .from("brand_accounts")
      .select("id, name, owner_user_id")
      .in("id", brandIds);
    const brandMap = new Map((brands ?? []).map((b: any) => [b.id, b]));

    const creatorIds = [...new Set((convos ?? []).map((c: any) => c.creator_id))];
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", creatorIds);
    const creatorMap = new Map((creators ?? []).map((p: any) => [p.id, p]));

    let sent = 0;

    for (const convo of convos ?? []) {
      const brand = brandMap.get(convo.brand_id);
      const brandOwnerId: string | undefined = brand?.owner_user_id;
      const list = byConversation.get(convo.id) ?? [];

      // Two possible recipients: the creator, and the brand owner.
      for (const recipientId of [convo.creator_id, brandOwnerId]) {
        if (!recipientId) continue;

        const unread = list.filter((m) => m.sender_id !== recipientId);
        if (!unread.length) continue;

        const latest = unread[0]; // list is newest-first
        const state: any = stateMap.get(stateKey(convo.id, recipientId));

        if (state?.last_seen_at) {
          const seen = new Date(state.last_seen_at).getTime();
          // Already looked at the conversation after the message arrived, or is
          // sitting in it right now.
          if (seen >= new Date(latest.created_at).getTime()) continue;
          if (now - seen < PRESENCE_GRACE_MINUTES * 60_000) continue;
        }

        if (state?.last_nudged_at && now - new Date(state.last_nudged_at).getTime() < NUDGE_COOLDOWN_HOURS * 3_600_000) {
          continue;
        }

        const isRecipientCreator = recipientId === convo.creator_id;
        const creator = creatorMap.get(convo.creator_id);
        const senderName = isRecipientCreator
          ? brand?.name || "A brand"
          : creator?.display_name || creator?.username || "A creator";

        const preview =
          latest.message_type === "text"
            ? latest.content.length > 150
              ? latest.content.slice(0, 147) + "..."
              : latest.content
            : latest.content?.slice(0, 150) || undefined;

        const bucket = Math.floor(now / (NUDGE_COOLDOWN_HOURS * 3_600_000));
        const key = `nudge-${convo.id}-${recipientId}-${bucket}`;

        const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "unread-messages",
            recipientUserId: recipientId,
            idempotencyKey: key,
            messageId: key,
            templateData: {
              senderName,
              messagePreview: preview,
              unreadCount: unread.length,
              recipientRole: isRecipientCreator ? "creator" : "brand",
            },
          },
        });

        if (sendErr) {
          console.error("nudge send failed", convo.id, recipientId, sendErr);
          continue;
        }

        await supabase.from("conversation_participant_state").upsert(
          {
            conversation_id: convo.id,
            user_id: recipientId,
            last_seen_at: state?.last_seen_at ?? new Date(0).toISOString(),
            last_nudged_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" },
        );

        sent++;
      }
    }

    return json({ processed: conversationIds.length, sent });
  } catch (err) {
    console.error("nudge-unread-messages failed", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
