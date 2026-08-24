import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://mystorefront.io").replace(/\/$/, "");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const callerId = claimsData.claims.sub;

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    if (!email) return json({ error: "email is required" }, 400);

    // Look up the auth user by email
    const { data: lookup, error: lookupError } = await adminClient
      .rpc("admin_find_auth_user_by_email", { p_email: email });
    if (lookupError) return json({ error: lookupError.message }, 400);

    const authUser = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!authUser?.id) {
      return json({ error: "No invited account exists for this email yet. Send the initial invite first." }, 404);
    }

    // Verify they have never logged in
    const { data: userDetail, error: userDetailError } = await adminClient.auth.admin.getUserById(authUser.id);
    if (userDetailError) return json({ error: userDetailError.message }, 400);
    if (userDetail?.user?.last_sign_in_at) {
      return json({ error: "This creator has already signed in.", alreadySignedIn: true }, 409);
    }

    // Mint (or refresh) a creator-invite token so the nudge email links straight
    // to /creator-invite?token=... — no single-use magic-link OTP required.
    const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const tokenBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(tokenBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: waitlistRow } = await adminClient
      .from("creator_waitlist")
      .select("id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (waitlistRow?.id) {
      await adminClient
        .from("creator_waitlist")
        .update({
          status: "invite_sent",
          invite_token_hash: tokenHash,
          invite_expires_at: expiresAt,
          invite_used_at: null,
          last_invite_sent_at: new Date().toISOString(),
        })
        .eq("id", waitlistRow.id);
    } else {
      // No waitlist row (edge case): create a minimal one so the token is trackable.
      await adminClient.from("creator_waitlist").insert({
        full_name: fullName || email,
        email,
        primary_platform: "instagram",
        social_handle: `nudge-${authUser.id.slice(0, 8)}`,
        niche: "Nudge",
        follower_range: "unknown",
        referral_source: "admin-nudge",
        status: "invite_sent",
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt,
        last_invite_sent_at: new Date().toISOString(),
      });
    }

    const magicLinkUrl = `${siteUrl}/creator-invite?token=${rawToken}`;

    const firstName = (fullName || "").trim().split(/\s+/)[0] || "there";

    // Send the nudge email
    const dayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { error: sendError } = await adminClient.functions.invoke("send-transactional-email", {
      body: {
        templateName: "creator-nudge-magic-link",
        recipientEmail: email,
        recipientUserId: authUser.id,
        idempotencyKey: `creator-nudge-${authUser.id}-${dayKey}`,
        templateData: { firstName, magicLinkUrl },
      },
    });
    if (sendError) return json({ error: sendError.message || "Failed to queue email" }, 400);

    await adminClient.from("admin_logs").insert({
      admin_user_id: callerId,
      action: "creator_nudge_sent",
      details: { email, user_id: authUser.id },
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
