import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteAction = "send" | "resend" | "regret" | "expire";

interface CreatorApplicationRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  other_link: string | null;
  primary_platform: string;
  follower_range: string;
  about_content: string | null;
}

const statusLabels: Record<string, string> = {
  pending_review: "Pending review",
  invite_sent: "Invite sent",
  account_created: "Account created",
  expired: "Expired",
  not_accepting: "Not accepting",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "there";
}

function getInviteCooldownSeconds(lastInviteSentAt?: string | null) {
  if (!lastInviteSentAt) return 0;
  const cooldownMs = 65_000;
  const remaining = cooldownMs - (Date.now() - new Date(lastInviteSentAt).getTime());
  return Math.max(0, Math.ceil(remaining / 1000));
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
    const siteUrl = Deno.env.get("SITE_URL") || "https://mystorefront.io";

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
    const action = body.action as InviteAction;
    let waitlistId = typeof body.waitlistId === "string" ? body.waitlistId : "";
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";

    if (!action || !["send", "resend", "regret", "expire"].includes(action)) {
      return json({ error: "Invalid action" }, 400);
    }

    await adminClient.rpc("expire_creator_waitlist_invites");

    if (action === "expire") {
      return json({ success: true });
    }

    let application: CreatorApplicationRecord | null = null;

    if (!waitlistId && applicationId) {
      const { data: applicationData, error: applicationError } = await adminClient
        .from("creator_applications")
        .select("id,first_name,last_name,email,instagram_handle,tiktok_handle,youtube_handle,other_link,primary_platform,follower_range,about_content")
        .eq("id", applicationId)
        .maybeSingle();

      if (applicationError) return json({ error: applicationError.message }, 400);
      if (!applicationData) return json({ error: "Creator application not found" }, 404);

      application = applicationData as CreatorApplicationRecord;
      const email = normalizeEmail(application.email);
      const { data: existingWaitlist, error: existingWaitlistError } = await adminClient
        .from("creator_waitlist")
        .select("id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingWaitlistError) return json({ error: existingWaitlistError.message }, 400);

      if (existingWaitlist?.id) {
        waitlistId = existingWaitlist.id;
      } else {
        const rawSocialHandle = application.instagram_handle || application.tiktok_handle || application.youtube_handle || application.other_link || `application-${application.id}`;
        const baseSocialHandle = rawSocialHandle.trim() || `application-${application.id}`;

        // Identity is the email. Social handle has a unique index, so if it
        // collides with another person's entry we suffix it to keep this
        // application's record distinct (don't reuse another user's row).
        const tryInsert = async (handle: string) => {
          return await adminClient
            .from("creator_waitlist")
            .insert({
              full_name: `${application!.first_name} ${application!.last_name}`.trim(),
              email,
              primary_platform: application!.primary_platform,
              social_handle: handle,
              niche: application!.about_content || "Creator application",
              follower_range: application!.follower_range,
              biggest_challenge: application!.about_content,
              referral_source: "/become-a-creator",
              status: "pending_review",
            })
            .select("id")
            .single();
        };

        let inserted = await tryInsert(baseSocialHandle);
        let attempts = 0;
        while (inserted.error && /duplicate key|unique/i.test(inserted.error.message) && attempts < 5) {
          attempts += 1;
          const suffix = application.id.slice(0, 4 + attempts);
          inserted = await tryInsert(`${baseSocialHandle}-${suffix}`);
        }

        if (inserted.error || !inserted.data) {
          return json({ error: inserted.error?.message || "Could not create waitlist entry" }, 400);
        }
        waitlistId = inserted.data.id;
      }
    }

    if (!waitlistId) return json({ error: "waitlistId or applicationId is required" }, 400);

    const { data: entry, error: entryError } = await adminClient
      .from("creator_waitlist")
      .select("*")
      .eq("id", waitlistId)
      .maybeSingle();

    if (entryError) return json({ error: entryError.message }, 400);
    if (!entry) return json({ error: "Waitlist entry not found" }, 404);

    if (action === "regret") {
      const { error: updateError } = await adminClient
        .from("creator_waitlist")
        .update({ status: "not_accepting", regret_email_sent_at: new Date().toISOString() })
        .eq("id", waitlistId);

      if (updateError) return json({ error: updateError.message }, 400);

      await adminClient.from("admin_logs").insert({
        admin_user_id: callerId,
        action: "creator_waitlist_regret",
        details: { waitlist_id: waitlistId, email: entry.email },
      });

      if (applicationId) {
        await adminClient
          .from("creator_applications")
          .update({ status: "declined", reviewed_by: callerId, reviewed_at: new Date().toISOString() })
          .eq("id", applicationId);

        await adminClient
          .from("creator_referrals")
          .update({ status: "declined" })
          .eq("application_id", applicationId)
          .eq("status", "pending");
      }

      return json({ success: true, status: "not_accepting" });
    }

    if (entry.status === "account_created") {
      return json({ success: true, status: "account_created", message: "This creator already created an account" });
    }

    if (action === "send" && !["pending_review", "expired", "not_accepting"].includes(entry.status)) {
      return json({ error: `Cannot send invite while status is ${statusLabels[entry.status] || entry.status}` }, 400);
    }

    if (action === "resend" && !["invite_sent", "pending_review", "expired", "not_accepting"].includes(entry.status)) {
      return json({ error: `Cannot resend invite while status is ${statusLabels[entry.status] || entry.status}` }, 400);
    }

    const cooldownSeconds = getInviteCooldownSeconds(entry.last_invite_sent_at);
    if ((action === "send" || action === "resend") && cooldownSeconds > 0) {
      return json({ error: `Please wait ${cooldownSeconds} seconds before resending this invite.` }, 429);
    }

    const rawToken = generateToken();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviteUrl = `${siteUrl.replace(/\/$/, "")}/creator-invite?token=${rawToken}`;
    const email = normalizeEmail(entry.email);

    const { error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: entry.full_name,
        role: "creator",
        first_name: getFirstName(entry.full_name),
      },
    });

    if (createUserError && !/already|registered|exists/i.test(createUserError.message)) {
      return json({ error: createUserError.message }, 400);
    }

    // The invite token itself is the auth proof — no Supabase magic-link OTP
    // is embedded. The link stays usable until `invite_expires_at` or until
    // the creator completes signup, so reopening the email works every time.
    const { data: sendData, error: sendError } = await adminClient.functions.invoke("send-transactional-email", {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: {
        templateName: "creator-magic-link",
        recipientEmail: email,
        idempotencyKey: `creator-invite-${waitlistId}-${Date.now()}`,
        templateData: {
          firstName: getFirstName(entry.full_name),
          magicLinkUrl: inviteUrl,
        },
      },
    });

    if (sendError || (sendData as any)?.error) {
      const inner = (sendData as any)?.error || sendError?.message || "Failed to send invite email";
      console.error("send-transactional-email failed", { email, waitlistId, sendError, sendData });
      return json({ error: `Email send failed: ${inner}` }, 400);
    }

    const { error: updateError } = await adminClient
      .from("creator_waitlist")
      .update({
        status: "invite_sent",
        last_invite_sent_at: new Date().toISOString(),
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt,
        invite_used_at: null,
      })
      .eq("id", waitlistId);

    if (updateError) return json({ error: updateError.message }, 400);

    await adminClient.from("admin_logs").insert({
      admin_user_id: callerId,
      action: action === "send" ? "creator_invite_sent" : "creator_invite_resent",
      details: { waitlist_id: waitlistId, email, expires_at: expiresAt },
    });

    if (applicationId) {
      const reviewedAt = new Date().toISOString();
      await adminClient
        .from("creator_applications")
        .update({ status: "approved", reviewed_by: callerId, reviewed_at: reviewedAt })
        .eq("id", applicationId);

      await adminClient
        .from("creator_referrals")
        .update({ status: "accepted", accepted_at: reviewedAt })
        .eq("application_id", applicationId)
        .eq("status", "pending");
    }

    return json({ success: true, status: "invite_sent", last_invite_sent_at: new Date().toISOString(), invite_expires_at: expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
