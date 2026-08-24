import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertBrandOwner } from "../_shared/brand-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportPayload {
  brand_id: string;
}

const fail = (error: string) =>
  new Response(JSON.stringify({ success: false, error }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify({ success: true, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normNum = (x: unknown): number | null => (x === null || x === undefined || x === "" ? null : Number(x));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { brand_id } = (await req.json()) as ImportPayload;
    if (!brand_id) return fail("brand_id is required");

    const authz = await assertBrandOwner(req, brand_id);
    if (!authz.ok) {
      return new Response(JSON.stringify({ success: false, error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wooSettings, error: wooError } = await supabase
      .from("brand_woocommerce_settings")
      .select("woocommerce_webhook_url, woocommerce_api_key, is_verified")
      .eq("brand_id", brand_id)
      .single();

    if (wooError || !wooSettings) return fail("No WooCommerce connection found for this brand.");
    if (!wooSettings.is_verified) return fail("WooCommerce connection is not verified.");

    const couponsEndpoint = wooSettings.woocommerce_webhook_url.replace("create-coupon", "coupons");

    let wooResponse: Response;
    try {
      wooResponse = await fetch(couponsEndpoint, {
        method: "GET",
        headers: {
          "X-Mystorefront-Key": wooSettings.woocommerce_api_key,
          "X-Hashtopic-Key": wooSettings.woocommerce_api_key,
        },
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return fail(`Failed to reach WooCommerce store: ${msg}`);
    }

    const rawBody = await wooResponse.text();
    if (!wooResponse.ok) return fail(`WooCommerce returned HTTP ${wooResponse.status}`);

    let parsedBody: { coupons?: unknown };
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return fail(
        "WooCommerce did not return coupon data (got a non-JSON response). Make sure the store is publicly reachable and the connection is verified.",
      );
    }

    const wooCoupons = parsedBody?.coupons;
    if (!Array.isArray(wooCoupons) || wooCoupons.length === 0) {
      return ok({
        imported: 0,
        updated: 0,
        deleted: 0,
        backfilled: 0,
        skipped: 0,
        message: "No coupons found in WooCommerce.",
      });
    }

    const { data: existingRows } = await supabase
      .from("discount_codes")
      .select(
        "id, code, wc_coupon_id, discount_type, discount_value, minimum_order_value, expiry_date, usage_limit, usage_count, is_active, needs_sync",
      )
      .eq("brand_id", brand_id);

    type Row = {
      id: string;
      code: string | null;
      wc_coupon_id: string | number | null;
      discount_type: string | null;
      discount_value: number | null;
      minimum_order_value: number | null;
      expiry_date: string | null;
      usage_limit: number | null;
      usage_count: number | null;
      is_active: boolean | null;
      needs_sync: boolean | null;
    };
    const byWcId = new Map<string, Row>();
    const byCode = new Map<string, { id: string; wc_coupon_id: string | null }>();
    for (const r of (existingRows ?? []) as Row[]) {
      const hasWcId = r.wc_coupon_id !== null && r.wc_coupon_id !== undefined && r.wc_coupon_id !== "";
      if (hasWcId) byWcId.set(String(r.wc_coupon_id), r);
      if (r.code) byCode.set(r.code.toUpperCase(), { id: r.id, wc_coupon_id: hasWcId ? String(r.wc_coupon_id) : null });
    }

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; fields: Record<string, unknown> }[] = [];
    const toBackfill: { id: string; wc_coupon_id: string }[] = [];
    let skipped = 0;

    for (const coupon of wooCoupons) {
      const code = (coupon.code as string).toUpperCase();
      const wcId =
        coupon.wc_coupon_id !== null && coupon.wc_coupon_id !== undefined ? String(coupon.wc_coupon_id) : null;

      const expiry = (coupon.expiry_date as string) ?? null;
      const desired = {
        code,
        discount_type: (coupon.discount_type as string) ?? "percentage",
        discount_value: Number(coupon.discount_value ?? 0),
        minimum_order_value: normNum(coupon.minimum_order_value),
        expiry_date: expiry,
        usage_limit: normNum(coupon.usage_limit),
        // Prefer the plugin's authoritative is_active (it reports the coupon's
        // real on/off state the same way deactivation is written). Fall back to
        // deriving from expiry for older plugin builds that don't send it.
        is_active: typeof coupon.is_active === "boolean" ? coupon.is_active : !expiry || new Date(expiry) > new Date(),
        // The store owns redemptions, so pull the count back. Previously this was
        // hardcoded to 0 on insert and never updated, so every WooCommerce code
        // showed "0 / limit" forever no matter how often it was used.
        usage_count: Number(normNum(coupon.usage_count) ?? 0),
      };

      // 1) Matched by stable WC id → update fields in place if anything changed.
      if (wcId && byWcId.has(wcId)) {
        const row = byWcId.get(wcId)!;

        // Skip rows that have a pending local push to WooCommerce. The plugin
        // may not have processed the change yet, so importing now would
        // overwrite the just-saved value (e.g. flipping a freshly deactivated
        // code back to active). push-discount-code clears needs_sync on success.
        if (row.needs_sync) {
          skipped++;
          continue;
        }

        const changed =
          String(row.code ?? "").toUpperCase() !== desired.code ||
          String(row.discount_type ?? "percentage") !== desired.discount_type ||
          Number(row.discount_value ?? 0) !== desired.discount_value ||
          normNum(row.minimum_order_value) !== desired.minimum_order_value ||
          (row.expiry_date ?? null) !== desired.expiry_date ||
          normNum(row.usage_limit) !== desired.usage_limit ||
          Number(row.usage_count ?? 0) !== desired.usage_count ||
          Boolean(row.is_active) !== desired.is_active;

        if (changed) {
          toUpdate.push({
            id: row.id,
            fields: {
              ...desired,
              woocommerce_synced: true,
              woocommerce_synced_at: new Date().toISOString(),
              needs_sync: false,
            },
          });
          byCode.delete(String(row.code ?? "").toUpperCase());
          byCode.set(desired.code, { id: row.id, wc_coupon_id: wcId });
        } else {
          skipped++;
        }
        continue;
      }

      // 2) Matched by code only (older row) → backfill the id, don't duplicate.
      if (byCode.has(code)) {
        const existing = byCode.get(code)!;
        if (wcId && !existing.wc_coupon_id && existing.id) {
          toBackfill.push({ id: existing.id, wc_coupon_id: wcId });
          existing.wc_coupon_id = wcId;
        }
        skipped++;
        continue;
      }

      // 3) Genuinely new → insert.
      byCode.set(code, { id: "", wc_coupon_id: wcId });
      toInsert.push({
        brand_id,
        code: desired.code,
        discount_type: desired.discount_type,
        discount_value: desired.discount_value,
        minimum_order_value: desired.minimum_order_value,
        expiry_date: desired.expiry_date,
        usage_limit: desired.usage_limit,
        notes: coupon.description
          ? `Imported from WooCommerce. ${coupon.description}`.trim()
          : "Imported from WooCommerce.",
        is_active: desired.is_active,
        usage_count: desired.usage_count,
        woocommerce_synced: true,
        woocommerce_synced_at: new Date().toISOString(),
        wc_coupon_id: wcId,
        // Critical: rows coming FROM WooCommerce must not re-trigger a push back
        // to WooCommerce. needs_sync defaults to true in the DB, which would
        // otherwise resurrect a code the user just deleted if the import poll
        // races the WC delete.
        needs_sync: false,
      });
    }

    // Counted so the delete sweep below can refuse to run on an incomplete
    // sync. The Shopify importer has always had this guard; this one did not.
    let writeErrors = 0;

    let updated = 0;
    for (const u of toUpdate) {
      const { error } = await supabase.from("discount_codes").update(u.fields).eq("id", u.id);
      if (error) {
        console.error("update error", error);
        writeErrors++;
      } else updated++;
    }

    let backfilled = 0;
    for (const b of toBackfill) {
      const { error } = await supabase.from("discount_codes").update({ wc_coupon_id: b.wc_coupon_id }).eq("id", b.id);
      if (error) {
        console.error("backfill error", error);
        writeErrors++;
      } else backfilled++;
    }

    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("discount_codes").insert(batch);
      if (error) {
        console.error("insert error", error);
        return fail(`Insert failed: ${error.message}`);
      }
      imported += batch.length;
    }

    const incomingWcIds = new Set<string>();
    for (const coupon of wooCoupons) {
      if (coupon.wc_coupon_id !== null && coupon.wc_coupon_id !== undefined)
        incomingWcIds.add(String(coupon.wc_coupon_id));
    }
    const toDelete = (existingRows ?? [])
      .filter(
        (r: Row) =>
          r.wc_coupon_id !== null &&
          r.wc_coupon_id !== undefined &&
          r.wc_coupon_id !== "" &&
          !incomingWcIds.has(String(r.wc_coupon_id)),
      )
      .map((r: Row) => r.id);
    // Deleting a local row fires the before_discount_code_delete trigger, which
    // pushes a DELETE to the merchant's LIVE store — so a truncated response here
    // destroys real coupons. An empty response is already handled by the early
    // return above; this guards the partial case.
    const syncedLocalCount = (existingRows ?? []).filter(
      (r: Row) => r.wc_coupon_id !== null && r.wc_coupon_id !== undefined && r.wc_coupon_id !== "",
    ).length;

    let deleted = 0;
    let deleteSkippedReason: string | null = null;

    if (writeErrors > 0) {
      // Some writes failed, so our picture of the store is incomplete and a
      // coupon that looks "missing" may simply not have been written yet.
      // Deleting it here would push a DELETE to the merchant's live store.
      deleteSkippedReason = `${writeErrors} write error(s) — skipping delete sweep until the sync is clean`;
      console.error("⚠️ DELETE SWEEP SKIPPED:", deleteSkippedReason);
    } else if (toDelete.length > 3 && toDelete.length > syncedLocalCount / 2) {
      deleteSkippedReason = `would remove ${toDelete.length} of ${syncedLocalCount} codes — refusing as a likely partial response, needs manual review`;
      console.error("⚠️ DELETE SWEEP SKIPPED:", deleteSkippedReason);
    } else if (toDelete.length > 0) {
      const { error } = await supabase.from("discount_codes").delete().in("id", toDelete);
      if (error) console.error("delete-missing error", error);
      else deleted = toDelete.length;
    }

    const parts: string[] = [];
    if (imported > 0) parts.push(`${imported} imported`);
    if (updated > 0) parts.push(`${updated} updated`);
    if (deleted > 0) parts.push(`${deleted} removed`);
    if (skipped > 0) parts.push(`${skipped} unchanged`);
    return ok({
      imported,
      updated,
      deleted,
      backfilled,
      skipped,
      upserted: imported + updated,
      delete_skipped: deleteSkippedReason,
      message: parts.length ? parts.join(", ") + "." : "Everything is already up to date.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("import-woocommerce-coupons: unhandled error", msg);
    return fail(msg);
  }
});
