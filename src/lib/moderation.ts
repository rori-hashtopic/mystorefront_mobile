import { supabase } from "@/integrations/supabase/client";

/**
 * Off-platform dealing phrases. Matched as case-insensitive substrings on
 * normalized whitespace. Add aliases here as patterns are discovered.
 */
export const OFF_PLATFORM_PHRASES: string[] = [
  "take this offline",
  "take it offline",
  "offline deal",
  "off platform",
  "off-platform",
  "outside the platform",
  "outside of the platform",
  "outside mystorefront",
  "outside of mystorefront",
  "bypass the platform",
  "bypass mystorefront",
  "invoice directly",
  "invoice you directly",
  "send an invoice",
  "send you an invoice",
  "pay directly",
  "pay you directly",
  "pay me directly",
  "direct payment",
  "direct deposit",
  "direct transfer",
  "wire transfer",
  "wire the money",
  "wire the funds",
  "bank transfer outside",
  "eft outside",
  "cash deal",
  "cash payment",
  "pay in cash",
  "avoid fees",
  "avoid the fees",
  "avoid commission",
  "avoid the commission",
  "skip the fees",
  "skip the commission",
  "skip mystorefront",
  "no commission",
  "no platform fee",
  "no platform fees",
  "without going through the platform",
  "without going through mystorefront",
  "venmo me",
  "paypal me directly",
  "zelle me",
  "cashapp me",
  "whatsapp me",
  "dm me on whatsapp",
  "email me directly",
  "contact me directly",
  "my personal email",
  "my personal number",
];

export interface ModerationResult {
  flagged: boolean;
  matchedPhrase?: string;
}

/**
 * Scan free text for off-platform dealing phrases.
 * Normalizes whitespace and lowercases before substring matching.
 */
export function detectOffPlatform(...parts: Array<string | null | undefined>): ModerationResult {
  const text = parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" \n ")
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!text.trim()) return { flagged: false };
  for (const phrase of OFF_PLATFORM_PHRASES) {
    if (text.includes(phrase)) {
      return { flagged: true, matchedPhrase: phrase };
    }
  }
  return { flagged: false };
}

export const OFF_PLATFORM_WARNING =
  "This message looks like it's trying to move the deal off MyStorefront. Off-platform payments and direct invoicing violate our Terms of Service. Please keep all transactions on the platform.";

/**
 * Log a flagged attempt. Best-effort — failures are swallowed so they never
 * block the UX. Caller is responsible for the actual block / warning shown.
 */
export async function logModerationFlag(params: {
  userId: string;
  content: string;
  matchedPhrase: string;
  conversationId?: string | null;
  context?: string;
}): Promise<void> {
  try {
    await supabase.from("message_moderation_flags").insert({
      user_id: params.userId,
      conversation_id: params.conversationId ?? null,
      context: params.context ?? "chat",
      content: params.content,
      matched_phrase: params.matchedPhrase,
    });
  } catch {
    // best-effort
  }
}
