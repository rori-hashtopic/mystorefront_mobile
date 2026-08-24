# Unread message nudge emails

Send a reminder email when someone leaves a message unread for an hour, so conversations don't stall.

## Behaviour

- A nudge fires when a message has been unread for **1 hour or more** and the recipient hasn't opened the conversation since it arrived.
- **One nudge per conversation per 24 hours**, no matter how many unread messages piled up.
- **Only messages that expect a reply**: normal chat messages and interactive requests (briefs, collab offers, gift offers, mention requests, discount codes, negotiation requests). Purely informational system notices ("Creator accepted", status confirmations) never trigger a nudge on their own.
- **Skip if the recipient is currently in the conversation** — if they viewed it within the last 5 minutes, no email.
- **Works both ways**: brands get nudged about creator messages, creators get nudged about brand messages.
- The email says who is waiting, how many unread messages there are, a short preview of the latest one, and links straight to the conversation.

## What gets built

1. **Presence tracking** — record when each participant last viewed a conversation, updated whenever the chat is open (on load and periodically while it stays open). Without this we can't tell "unread" from "sitting on the screen".
2. **Nudge history** — record of the last nudge sent per conversation per recipient, enforcing the 24h gap.
3. **Background job** — runs every 10 minutes, finds qualifying conversations, and queues one email per recipient.
4. **Email template** — "You have unread messages" in the existing editorial email style, matching the current new-message email.

## Technical notes

- New table `conversation_participant_state` (conversation_id, user_id, last_seen_at, last_nudged_at) with RLS: a participant may read/write only their own row; the nudge job writes via service role.
- Client: `ChatView` upserts `last_seen_at` on mount, on conversation switch, on new incoming message, and on a ~60s heartbeat while mounted.
- New edge function `nudge-unread-messages` (service role, no JWT):
  - Selects conversations whose newest message is 1h–24h old, `is_read = false`, `message_type` in the reply-expected set, and sender != recipient.
  - Resolves recipient: creator side = `conversations.creator_id`; brand side = `brand_accounts.owner_user_id`.
  - Excludes when `last_seen_at > newest message created_at` or `last_seen_at > now() - 5 min`, or `last_nudged_at > now() - 24h`.
  - Calls `send-transactional-email` with template `unread-messages`, `idempotencyKey` = `nudge-{conversation_id}-{recipient}-{hour bucket}`, then stamps `last_nudged_at`.
- New template `supabase/functions/_shared/transactional-email-templates/unread-messages.tsx`, registered in `registry.ts`; deploy the send/preview/queue functions after.
- pg_cron job every 10 minutes invoking the function via `net.http_post` with the vault service key (same pattern as the existing email dispatch), applied with the insert tool rather than a migration.
- Reply-expected `message_type` set: `text`, `brief`, `mention_request`, `gift_offer`, `discount_code`, `paid_collab`. `system` messages are excluded unless a future flag marks them actionable.
