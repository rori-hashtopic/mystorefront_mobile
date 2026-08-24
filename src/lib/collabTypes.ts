/**
 * Single source of truth for what a collab's compensation type actually means.
 *
 * These two questions are genuinely different and were previously conflated:
 *
 *   "does this collab produce content the brand has to review?"  (deliverables)
 *   "does this collab pay the creator a cash fee?"               (money)
 *
 * CollabManageDrawer used its cash-fee predicate (`isPaid`) to gate the Content
 * Submissions section. "Gifting + Deliverables" is the one type that is
 * content-bearing but fee-free, so it fell through the gap: creators could
 * upload drafts the brand had no way to open, approve or reject — which in turn
 * blocked live posts, blocked Verify Live, and left the brand's amber "needs
 * attention" dot permanently stuck on.
 *
 * Membership is ENUMERATED on purpose. The old spellings — `!== "Gifting"` and
 * `!startsWith("Gifting") || === "Gifting + Deliverables"` — silently opt any
 * new compensation type into draft submission the moment it is added. Listing
 * them means a seventh type has to be considered deliberately.
 *
 * DELIVERABLE_TYPES mirrors `needsDeliverables` in BrandPaidCollabs, and
 * FEE_TYPES mirrors `needsFee` there — those are the lines that decide what
 * actually gets written to paid_collabs at creation time, so they are the
 * authority on intent.
 */

/** Compensation types that produce content the brand must review. */
export const DELIVERABLE_TYPES = [
  "Gifting + Deliverables",
  "Paid Campaign",
  "Paid Campaign + Gifting",
  "Mention Request",
] as const;

/** Compensation types that carry a cash fee to the creator. */
export const FEE_TYPES = ["Paid Campaign", "Paid Campaign + Gifting", "Mention Request"] as const;

export const hasContentDeliverables = (type?: string | null): boolean =>
  !!type && (DELIVERABLE_TYPES as readonly string[]).includes(type);

export const hasCashFee = (type?: string | null): boolean => !!type && (FEE_TYPES as readonly string[]).includes(type);
