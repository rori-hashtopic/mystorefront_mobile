import { supabase } from "@/integrations/supabase/client";

// Centralised sender for the `collab-status` transactional email so the
// (fiddly) recipient-resolution + templateData shape lives in one place
// instead of being copy-pasted across the messaging + brand components.
//
// Every function here is fire-and-forget: an email hiccup must NEVER block or
// roll back the status update the user just made, so failures are logged only.

type Role = "brand" | "creator";

interface CollabStatusFields {
  status: string; // semantic email label (see collab-status.tsx STATUS_META keys)
  collabTitle?: string | null;
  compensationType?: string | null;
  feeAmount?: number | null;
  productName?: string | null;
  counterNote?: string | null;
  brandName?: string | null;
  creatorName?: string | null;
  deliverableCount?: number | null;
  deliverableType?: string | null;
  goLiveDate?: string | null;
}

async function sendCollabStatus(
  recipientUserId: string,
  recipientRole: Role,
  idempotencyKey: string,
  fields: CollabStatusFields,
) {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "collab-status",
        recipientUserId,
        idempotencyKey,
        // The email queue dedupes on `messageId` (email_send_log.message_id), NOT on
        // idempotencyKey — send-transactional-email otherwise falls back to a random
        // UUID and nothing dedupes. Pinning it to our stable key makes repeat/parallel
        // sends (incl. the notify_brand_on_paid_collab_status_change DB trigger, which
        // uses this same key) collapse to a single email.
        messageId: idempotencyKey,
        templateData: {
          recipientRole,
          status: fields.status,
          collabTitle: fields.collabTitle ?? undefined,
          compensationType: fields.compensationType ?? undefined,
          feeAmount: fields.feeAmount ?? undefined,
          productName: fields.productName ?? undefined,
          counterNote: fields.counterNote ?? undefined,
          brandName: fields.brandName ?? undefined,
          creatorName: fields.creatorName ?? undefined,
          deliverableCount: fields.deliverableCount ?? undefined,
          deliverableType: fields.deliverableType ?? undefined,
          goLiveDate: fields.goLiveDate ?? undefined,
        },
      },
    });
  } catch (err) {
    console.error("collab-status email failed", err);
  }
}

/**
 * Notify the BRAND owner that a creator changed a collab's status
 * (e.g. draft submitted, posted live). Callers only need the collab id and the
 * acting creator id — the brand owner, title and product details are resolved
 * from the collab so no extra data has to be threaded through the UI.
 */
export async function emailBrandOnCollabStatus(params: {
  collabId: string;
  creatorId: string;
  status: string;
  /** Provide to guarantee a unique send when the same status can recur. */
  idempotencySuffix?: string | number;
}) {
  try {
    const { data: collab } = await supabase
      .from("paid_collabs" as any)
      .select(
        "brand_id, title, compensation_type, fee_amount, product_name, deliverable_count, deliverable_type, go_live_date",
      )
      .eq("id", params.collabId)
      .maybeSingle();

    const brandId = (collab as any)?.brand_id;
    if (!brandId) return;

    const { data: ownerId } = await supabase.rpc("get_brand_owner_user_id", { p_brand_id: brandId });
    if (!ownerId) return;

    // Personalise the "who" in the brand-facing copy with the creator's name.
    const { data: creator } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", params.creatorId)
      .maybeSingle();

    const suffix = params.idempotencySuffix ?? "";
    await sendCollabStatus(
      ownerId as string,
      "brand",
      `collab-status-${params.collabId}-${params.creatorId}-${params.status}-${suffix}`,
      {
        status: params.status,
        collabTitle: (collab as any)?.title,
        compensationType: (collab as any)?.compensation_type,
        feeAmount: (collab as any)?.fee_amount,
        productName: (collab as any)?.product_name,
        creatorName: (creator as any)?.display_name,
        deliverableCount: (collab as any)?.deliverable_count,
        deliverableType: (collab as any)?.deliverable_type,
        goLiveDate: (collab as any)?.go_live_date,
      },
    );
  } catch (err) {
    console.error("emailBrandOnCollabStatus failed", err);
  }
}

/**
 * Notify a CREATOR that the brand changed a collab's status
 * (e.g. shipped, approved, paid). The caller already has the creator's user id
 * and the collab details, so nothing needs to be fetched.
 */
export async function emailCreatorOnCollabStatus(params: {
  creatorUserId: string;
  /** Scopes the idempotency key so the same status in a DIFFERENT collab is not deduped away. */
  collabId?: string;
  status: string;
  brandName?: string | null;
  collabTitle?: string | null;
  compensationType?: string | null;
  feeAmount?: number | null;
  productName?: string | null;
  /** Provide to guarantee a unique send when the same status can recur. */
  idempotencySuffix?: string | number;
}) {
  const suffix = params.idempotencySuffix ?? "";
  await sendCollabStatus(
    params.creatorUserId,
    "creator",
    `collab-status-${params.creatorUserId}-${params.collabId ?? ""}-${params.status}-${suffix}`,
    {
      status: params.status,
      brandName: params.brandName,
      collabTitle: params.collabTitle,
      compensationType: params.compensationType,
      feeAmount: params.feeAmount,
      productName: params.productName,
    },
  );
}
