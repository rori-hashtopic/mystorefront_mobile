import { supabase } from "@/integrations/supabase/client";

// Centralised sender for the creator-facing "you've been assigned a discount
// code" email, mirroring the pattern in collabEmails.ts so the recipient +
// templateData shape lives in one place instead of being copy-pasted across the
// three brand-side surfaces that can assign a code:
//
//   • BrandPaidCollabs.tsx        → "Discount Code" compensation type
//   • CreateDiscountCodeModal.tsx → Discount Codes panel → Create
//   • AssignDiscountCodeModal.tsx → Discount Codes panel → Assign
//
// The messaging surface (CollabComposer.tsx) already emails on its own and is
// deliberately NOT routed through here — leaving it untouched avoids a
// duplicate-send race.
//
// This is fire-and-forget: an email hiccup must NEVER block or roll back the
// code the brand just created, so failures are logged only.

interface AssignedDiscountEmailParams {
  /** Creator's auth user id (profiles.id). No email is sent when absent. */
  creatorUserId: string | null | undefined;
  /** discount_codes row id — scopes the idempotency key so the same code string
   *  assigned to a different creator is not deduped away. Falls back to the
   *  code itself when the id could not be captured. */
  discountCodeId?: string | null;
  code: string;
  discountType: string;
  discountValue: number;
  expiryDate?: string | null;
  notes?: string | null;
  brandName: string;
}

export async function emailCreatorOnDiscountAssigned(params: AssignedDiscountEmailParams) {
  if (!params.creatorUserId) return;

  const scope = params.discountCodeId || params.code;
  // The email queue dedupes on `messageId` (email_send_log.message_id), NOT on
  // idempotencyKey — send-transactional-email otherwise falls back to a random
  // UUID and nothing dedupes. Pin both to the same stable key.
  const key = `discount-assigned-${scope}-${params.creatorUserId}`;

  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "collab-invite-creator",
        recipientUserId: params.creatorUserId,
        idempotencyKey: key,
        messageId: key,
        templateData: {
          brandName: params.brandName,
          compensationType: "Discount Code",
          discountCode: params.code,
          discountType: params.discountType,
          discountValue: params.discountValue,
          expiryDate: params.expiryDate || undefined,
          discountNotes: params.notes || undefined,
        },
      },
    });
  } catch (err) {
    console.error("discount assigned email failed", err);
  }
}

/**
 * The `brief_data` payload a `discount_code` message needs in order to render as
 * a DiscountCodeCard. ChatView gates on `message_type === "discount_code" &&
 * msg.brief_data` — without this the message falls through to plain text and the
 * creator never gets an Acknowledge button.
 */
export function buildDiscountBriefData(params: {
  code: string;
  discountType: string;
  discountValue: number;
  expiryDate?: string | null;
  notes?: string | null;
  discountCodeId?: string | null;
}) {
  return {
    code: params.code,
    discount_type: params.discountType,
    discount_value: params.discountValue,
    expiry_date: params.expiryDate || undefined,
    notes: params.notes || undefined,
    discount_code_id: params.discountCodeId || undefined,
    status: "assigned" as const,
  };
}
