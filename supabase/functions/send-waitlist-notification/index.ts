import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTIFY_EMAIL = "roxi@mystorefront.io";
const SITE_NAME = "MyStorefront";
const FROM_DOMAIN = "mystorefront.io";
const SENDER_DOMAIN = "notify.mystorefront.io";

/** Escape any value before it is interpolated into the notification HTML. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .slice(0, 2000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  return `<tr><td style="padding: 6px 0; font-weight: 600;">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

function buildCreatorHtml(data: Record<string, unknown>) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf9f7;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1a1d24; margin-bottom: 8px;">
        New Creator Waitlist Signup
      </h1>
      <hr style="border: none; border-top: 1px solid #e8e5e0; margin: 16px 0;" />
      <table style="width: 100%; font-size: 14px; color: #333;">
        ${row("Name", data.full_name)}
        ${row("Email", data.email)}
        ${row("Platform", data.primary_platform)}
        ${row("Handle", data.social_handle)}
        ${row("Niche", data.niche)}
        ${row("Followers", data.follower_range)}
        ${row("Referral", data.referral_source)}
        ${row("Challenge", data.biggest_challenge)}
      </table>
    </div>
  `;
}

function buildBrandHtml(data: Record<string, unknown>) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf9f7;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1a1d24; margin-bottom: 8px;">
        New Brand Waitlist Signup
      </h1>
      <hr style="border: none; border-top: 1px solid #e8e5e0; margin: 16px 0;" />
      <table style="width: 100%; font-size: 14px; color: #333;">
        ${row("Brand", data.brand_name)}
        ${row("Contact", data.full_name)}
        ${row("Email", data.email)}
        ${row("Website", data.website_url)}
        ${row("Goals", data.goals)}
        ${row("Partnerships", data.partnership_types)}
        ${row("Store platform", data.store_platform)}
        ${row("Challenge", data.biggest_challenge)}
      </table>
    </div>
  `;
}

/** Deterministic message id so a given waitlist row can only trigger one email. */
async function deterministicId(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const type = typeof body?.type === "string" ? body.type : "";
    // Only an email is accepted from the caller — all content is read back from
    // the database so nothing user-supplied is trusted or injected into HTML.
    const email = String(body?.email ?? body?.data?.email ?? "").trim().toLowerCase().slice(0, 255);

    if ((type !== "creator" && type !== "brand") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const isCreator = type === "creator";
    const table = isCreator ? "creator_waitlist" : "brand_waitlist";

    const { data: record, error: recordError } = await supabase
      .from(table)
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recordError) {
      console.error("Waitlist lookup failed", recordError);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!record) {
      // No matching signup — refuse to send anything.
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = record as Record<string, unknown>;
    const subject = isCreator
      ? `New Creator Waitlist: ${String(data.full_name ?? email).slice(0, 120)}`
      : `New Brand Waitlist: ${String(data.brand_name ?? email).slice(0, 120)}`;
    const html = isCreator ? buildCreatorHtml(data) : buildBrandHtml(data);

    const messageId = await deterministicId(`waitlist:${table}:${String(data.id ?? email)}`);

    // Idempotency: one notification per waitlist row, so the endpoint cannot be
    // used to flood the admin inbox with repeated calls.
    const { data: existing } = await supabase
      .from("email_send_log")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unsubscribeToken = crypto.randomUUID();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert({ email: NOTIFY_EMAIL, token: unsubscribeToken }, { onConflict: "email" });
    const { data: tokenRow } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", NOTIFY_EMAIL)
      .maybeSingle();

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "waitlist_notification",
      recipient_email: NOTIFY_EMAIL,
      status: "pending",
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        idempotency_key: `waitlist-${messageId}`,
        unsubscribe_token: tokenRow?.token || unsubscribeToken,
        to: NOTIFY_EMAIL,
        from: `${SITE_NAME} <notifications@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: subject,
        purpose: "transactional",
        label: "waitlist_notification",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue waitlist notification", enqueueError);
      return new Response(JSON.stringify({ error: "Failed to enqueue" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
