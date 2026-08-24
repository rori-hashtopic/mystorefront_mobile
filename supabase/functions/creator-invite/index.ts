import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatorInviteRecord {
  id: string;
  full_name: string;
  email: string;
  status: string;
  invite_expires_at: string | null;
  invite_used_at: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as "validate" | "complete" | "resend_magic_link";
    const rawToken = typeof body.token === "string" ? body.token : "";

    if (!action || !["validate", "complete", "resend_magic_link"].includes(action))
      return json({ error: "Invalid action" }, 400);
    if (!rawToken || rawToken.length < 32) return json({ error: "Invite token is missing" }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.rpc("expire_creator_waitlist_invites");

    const tokenHash = await sha256Hex(rawToken);
    const { data: inviteData, error: inviteError } = await adminClient
      .rpc("get_creator_waitlist_invite_by_hash", { p_token_hash: tokenHash })
      .maybeSingle();

    if (inviteError) return json({ error: inviteError.message }, 400);
    if (!inviteData) {
      if (action === "resend_magic_link") {
        return json(
          {
            error:
              "This invite has already been used or is no longer active. Please log in at mystorefront.io/auth instead.",
            code: "invite_not_found",
          },
          404,
        );
      }
      return json({ error: "Invite not found" }, 404);
    }
    const invite = inviteData as CreatorInviteRecord;

    const expired = invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now();
    if (expired && invite.status === "invite_sent") {
      await adminClient.from("creator_waitlist").update({ status: "expired" }).eq("id", invite.id);
    }

    if (action === "resend_magic_link") {
      // Re-issue the same invite URL (token stays valid until invite_expires_at).
      // We don't mint a Supabase magic-link OTP here — the invite token itself
      // is the auth proof, so the email is safe to reopen from any device.
      const siteUrl = (Deno.env.get("SITE_URL") || "https://mystorefront.io").replace(/\/$/, "");
      const inviteUrl = `${siteUrl}/creator-invite?token=${rawToken}`;
      const { error: sendError } = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "creator-invite",
          recipientEmail: normalizeEmail(invite.email),
          idempotencyKey: `creator-invite-resend-${invite.id}-${Date.now()}`,
          templateData: {
            firstName: (invite.full_name || "").trim().split(/\s+/)[0] || "there",
            magicLinkUrl: inviteUrl,
          },
        },
      });
      if (sendError) return json({ error: sendError.message || "Could not send invite email" }, 400);
      return json({ success: true, email: invite.email });
    }

    if (invite.invite_used_at || invite.status === "account_created") {
      return json({ error: "This invite has already been used", code: "used" }, 410);
    }

    if (expired || invite.status === "expired") {
      return json({ error: "This invite has expired", code: "expired" }, 410);
    }

    if (invite.status !== "invite_sent") {
      return json({ error: "This invite is no longer active", code: "inactive" }, 410);
    }

    if (action === "validate") {
      return json({
        success: true,
        invite: {
          id: invite.id,
          full_name: invite.full_name,
          email: invite.email,
          invite_expires_at: invite.invite_expires_at,
        },
      });
    }

    // === action === "complete" ===
    // The invite token IS the auth proof — no bearer required. This lets the
    // creator finish signup even after closing/reopening the email tab.
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    const inviteEmail = normalizeEmail(invite.email);

    // Find (or create) the auth user for this invite email.
    const { data: lookup } = await adminClient.rpc("admin_find_auth_user_by_email", { p_email: inviteEmail });
    const existing = Array.isArray(lookup) ? lookup[0] : lookup;
    let userId: string | null = existing?.id ?? null;

    if (!userId) {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: inviteEmail,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: invite.full_name,
          role: "creator",
          first_name: (invite.full_name || "").trim().split(/\s+/)[0] || "there",
        },
      });
      if (createError || !created?.user) {
        return json({ error: createError?.message || "Could not create account" }, 400);
      }
      userId = created.user.id;
    } else {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updateError) return json({ error: updateError.message }, 400);
    }

    await adminClient.from("profiles").upsert(
      {
        id: userId,
        email: inviteEmail,
        display_name: invite.full_name,
        onboarding_completed: false,
        onboarding_step: 0,
        marketing_consent: true,
        marketing_consent_updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    await adminClient.from("user_roles").upsert(
      {
        user_id: userId,
        role: "creator",
      },
      { onConflict: "user_id,role" },
    );

    // Burn the invite so subsequent clicks route to /auth.
    const { error: burnError } = await adminClient
      .from("creator_waitlist")
      .update({
        status: "account_created",
        invited_user_id: userId,
        invite_used_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .is("invite_used_at", null);

    if (burnError) return json({ error: burnError.message }, 400);

    const { data: linkedApplication } = await adminClient
      .from("creator_applications")
      .select("id")
      .eq("email", inviteEmail)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkedApplication?.id) {
      await adminClient
        .from("creator_referrals")
        .update({
          status: "account_created",
          referred_user_id: userId,
          account_created_at: new Date().toISOString(),
        })
        .eq("application_id", linkedApplication.id)
        .in("status", ["accepted", "pending"]);
    }

    // Mint a one-shot magic-link OTP so the browser can immediately hydrate
    // a session via supabase.auth.verifyOtp. This OTP is generated and
    // consumed within the same round-trip — it never appears in an email.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: inviteEmail,
    });
    if (linkError) return json({ error: linkError.message }, 400);
    const hashedToken = linkData?.properties?.hashed_token;

    return json({
      success: true,
      redirectTo: "/shop",
      session: hashedToken ? { hashed_token: hashedToken, type: "magiclink" } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
