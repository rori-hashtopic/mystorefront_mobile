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

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-brand cap on invites created in a rolling 24 hours.
const DAILY_INVITE_LIMIT = 25;

const SUPPORT_EMAIL = "roxi@mystorefront.io";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = (Deno.env.get("SITE_URL") || "https://mystorefront.io").replace(/\/$/, "");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server misconfigured" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action as string;
  if (!action) return json({ error: "Missing action" }, 400);

  // Identify caller (optional for some actions)
  async function getCaller(): Promise<{ userId: string | null }> {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) return { userId: null };
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    // Validate with an anon client using getClaims — the service-role client's
    // getUser() rejects user JWTs under the signing-keys setup, which surfaced
    // as a blanket 401 on every authenticated action.
    const authClient = createClient(supabaseUrl!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error } = await authClient.auth.getClaims(jwt);
    const sub = claimsData?.claims?.sub as string | undefined;
    if (!error && sub) return { userId: sub };

    const { data, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !data?.user) return { userId: null };
    return { userId: data.user.id };
  }

  async function getBrandForCaller(callerId: string) {
    const { data } = await admin.from("brand_accounts").select("id, name").eq("owner_user_id", callerId).maybeSingle();
    return data;
  }

  // brand_accounts has no contact address, so replies route to the account
  // owner. Falls back to support so a reply is never silently lost.
  async function getBrandReplyTo(callerId: string) {
    const { data } = await admin.from("profiles").select("email").eq("id", callerId).maybeSingle();
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    return EMAIL_RE.test(email) ? email : SUPPORT_EMAIL;
  }

  try {
    if (action === "create") {
      const { userId } = await getCaller();
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const brand = await getBrandForCaller(userId);
      if (!brand) return json({ error: "No brand account for this user" }, 403);

      const welcome = typeof body.welcome_message === "string" ? body.welcome_message.trim().slice(0, 1000) : "";
      const invitedName = typeof body.invited_name === "string" ? body.invited_name.trim().slice(0, 120) : "";
      const invitedEmail = normalizeEmail(body.invited_email || "");

      // Email is now the primary path. A missing address is only allowed when
      // the caller explicitly asks for a copyable link instead.
      const linkOnly = body.link_only === true;
      if (!linkOnly) {
        if (!invitedEmail) return json({ error: "A creator email address is required" }, 400);
        if (!EMAIL_RE.test(invitedEmail)) return json({ error: "That doesn't look like a valid email address" }, 400);
      }

      if (invitedEmail) {
        // Already on the platform? Don't invite them into a second account —
        // the brand should just message them.
        const { data: existing } = await admin.rpc("admin_find_auth_user_by_email", { p_email: invitedEmail });
        const alreadyRegistered = Array.isArray(existing) ? existing.length > 0 : !!existing;
        if (alreadyRegistered) {
          return json(
            {
              error: "already_registered",
              message: "That creator already has a MyStorefront account — message them directly instead.",
            },
            409,
          );
        }

        // Don't let a brand pile up invites on one address.
        const { data: dupe } = await admin
          .from("brand_creator_invites")
          .select("id")
          .eq("brand_id", brand.id)
          .eq("invited_email", invitedEmail)
          .eq("status", "active")
          .maybeSingle();
        if (dupe) {
          return json(
            {
              error: "already_invited",
              message: "You already have an active invite out to that address. Revoke it first to send a new one.",
            },
            409,
          );
        }

        // Cheap spam brake: brands send invites in ones and twos, not hundreds.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await admin
          .from("brand_creator_invites")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brand.id)
          .gte("created_at", since);
        if ((count || 0) >= DAILY_INVITE_LIMIT) {
          return json({ error: `Daily invite limit reached (${DAILY_INVITE_LIMIT}). Try again tomorrow.` }, 429);
        }
      }

      const token = randomToken(32);
      const tokenHash = await sha256Hex(token);

      const { data, error } = await admin
        .from("brand_creator_invites")
        .insert({
          brand_id: brand.id,
          created_by_user_id: userId,
          token_hash: tokenHash,
          welcome_message: welcome || null,
          invited_email: invitedEmail || null,
          invited_name: invitedName || null,
        })
        .select("id, expires_at, created_at")
        .single();
      if (error) return json({ error: error.message }, 400);

      const url = `${siteUrl}/brand-invite?token=${token}`;
      let emailSent = false;

      if (invitedEmail) {
        const replyTo = await getBrandReplyTo(userId);
        const { data: sendData, error: sendError } = await admin.functions.invoke("send-transactional-email", {
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
          body: {
            templateName: "brand-creator-invite",
            recipientEmail: invitedEmail,
            replyTo,
            idempotencyKey: `brand-invite-${data.id}`,
            templateData: {
              firstName: invitedName ? invitedName.split(" ")[0] : "",
              brandName: brand.name || "A brand",
              welcomeMessage: welcome || "",
              inviteUrl: url,
              replyToEmail: replyTo,
            },
          },
        });

        if (sendError || (sendData as any)?.error) {
          // The invite row is real and the link works, so don't fail the whole
          // request — roll the row back to revoked and tell the brand, so they
          // don't think an email went out when it didn't.
          const inner = (sendData as any)?.error || sendError?.message || "Unknown error";
          console.error("brand invite email failed", { inviteId: data.id, inner });
          await admin.from("brand_creator_invites").update({ status: "revoked" }).eq("id", data.id);
          return json({ error: `Couldn't send the invite email: ${inner}` }, 502);
        }

        emailSent = true;
        await admin.from("brand_creator_invites").update({ email_sent_at: new Date().toISOString() }).eq("id", data.id);
      }

      return json({
        success: true,
        invite: {
          id: data.id,
          url,
          expires_at: data.expires_at,
          created_at: data.created_at,
          welcome_message: welcome || null,
          invited_email: invitedEmail || null,
          invited_name: invitedName || null,
          email_sent: emailSent,
        },
      });
    }

    if (action === "list") {
      const { userId } = await getCaller();
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const brand = await getBrandForCaller(userId);
      if (!brand) return json({ error: "No brand account" }, 403);

      const { data, error } = await admin
        .from("brand_creator_invites")
        .select(
          "id, status, welcome_message, expires_at, created_at, redeemed_at, redeemed_by_user_id, invited_email, invited_name, email_sent_at",
        )
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 400);

      const redeemedIds = Array.from(
        new Set((data || []).map((r: any) => r.redeemed_by_user_id).filter(Boolean)),
      ) as string[];
      let nameMap = new Map<string, string>();
      if (redeemedIds.length > 0) {
        const { data: profs } = await admin.from("profiles").select("id, display_name, email").in("id", redeemedIds);
        for (const p of profs || []) {
          const name =
            (p.display_name && p.display_name.trim()) || (p.email ? String(p.email).split("@")[0] : "") || "Creator";
          nameMap.set(p.id, name);
        }
      }
      const invites = (data || []).map((r: any) => ({
        ...r,
        redeemed_by_name: r.redeemed_by_user_id ? nameMap.get(r.redeemed_by_user_id) || "Creator" : null,
      }));
      return json({ success: true, invites });
    }

    if (action === "revoke") {
      const { userId } = await getCaller();
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const brand = await getBrandForCaller(userId);
      if (!brand) return json({ error: "No brand account" }, 403);
      const inviteId = body.invite_id as string;
      if (!inviteId) return json({ error: "Missing invite_id" }, 400);

      const { error } = await admin
        .from("brand_creator_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId)
        .eq("brand_id", brand.id)
        .eq("status", "active");
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // Public actions below — token-based
    const rawToken = typeof body.token === "string" ? body.token : "";
    if (!rawToken || rawToken.length < 32) return json({ error: "Invalid invite token" }, 400);
    const tokenHash = await sha256Hex(rawToken);

    const { data: invite } = await admin.rpc("get_brand_invite_by_hash", { p_token_hash: tokenHash }).maybeSingle();
    if (!invite) return json({ error: "Invite not found" }, 404);

    const expired = invite.expires_at && new Date(invite.expires_at).getTime() < Date.now();
    if (expired && invite.status === "active") {
      await admin.from("brand_creator_invites").update({ status: "expired" }).eq("id", invite.id);
      invite.status = "expired";
    }

    if (action === "validate") {
      return json({
        success: true,
        invite: {
          brand_id: invite.brand_id,
          brand_name: invite.brand_name,
          brand_logo_url: invite.brand_logo_url,
          welcome_message: invite.welcome_message,
          status: invite.status,
          expires_at: invite.expires_at,
          // Returned so the landing page can prefill and lock the field.
          // Safe to expose: the holder of the token was sent it at this address.
          invited_email: invite.invited_email ?? null,
          invited_name: invite.invited_name ?? null,
        },
      });
    }

    if (action === "check_email") {
      const email = normalizeEmail(body.email || "");
      if (!email) return json({ error: "Email required" }, 400);
      const { data } = await admin.rpc("admin_find_auth_user_by_email", { p_email: email });
      const exists = Array.isArray(data) ? data.length > 0 : !!data;
      return json({ success: true, exists });
    }

    if (action === "signup") {
      if (invite.status !== "active") {
        return json({ error: `This invite is ${invite.status}` }, 410);
      }
      const email = normalizeEmail(body.email || "");
      const password = typeof body.password === "string" ? body.password : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      if (!email || !displayName || password.length < 6) {
        return json({ error: "Email, name, and a password (6+ chars) are required" }, 400);
      }

      // An emailed invite is bound to its recipient. Without this, anyone the
      // link is forwarded to could sign up under their own address — and
      // because we auto-confirm below, they'd get a verified account for an
      // address they never proved they own.
      const addressee = normalizeEmail(invite.invited_email || "");
      if (addressee && email !== addressee) {
        return json(
          {
            error: `This invite was sent to ${addressee}. Please sign up with that address, or ask ${invite.brand_name} for a new invite.`,
            code: "email_mismatch",
          },
          403,
        );
      }

      // Check if user already exists
      const { data: existing } = await admin.rpc("admin_find_auth_user_by_email", { p_email: email });
      const existingUser = Array.isArray(existing) ? existing[0] : existing;
      if (existingUser) {
        return json({ error: "An account with this email already exists. Please log in.", code: "exists" }, 409);
      }

      // Create user (email auto-confirmed since they hold the token)
      // Auto-confirm only when the invite was emailed to this exact address —
      // receiving the token there is the proof of ownership. Legacy link-only
      // invites can't prove anything, so those accounts confirm by email.
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: !!addressee,
        user_metadata: { display_name: displayName, role: "creator" },
      });
      if (createError || !created?.user) {
        return json({ error: createError?.message || "Failed to create account" }, 400);
      }
      const newUserId = created.user.id;

      // Ensure profile + role exist (handle_new_user trigger usually does this, but be defensive)
      await admin.from("profiles").upsert(
        {
          id: newUserId,
          email,
          display_name: displayName,
          onboarding_completed: false,
          onboarding_step: 0,
          marketing_consent: true,
          marketing_consent_updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      await admin.from("user_roles").upsert({ user_id: newUserId, role: "creator" }, { onConflict: "user_id,role" });

      // Connect to brand: conversation + welcome message + saved list
      const welcomeText =
        invite.welcome_message?.trim() || `Hi ${displayName.split(/\s+/)[0]}, welcome to MyStorefront!`;

      // Look up the brand owner to be the sender
      const { data: brandRow } = await admin
        .from("brand_accounts")
        .select("owner_user_id")
        .eq("id", invite.brand_id)
        .maybeSingle();

      if (brandRow?.owner_user_id) {
        // Upsert conversation (unique brand_id+creator_id)
        let conversationId: string | null = null;
        const { data: convo, error: convoErr } = await admin
          .from("conversations")
          .insert({ brand_id: invite.brand_id, creator_id: newUserId })
          .select("id")
          .single();
        if (convoErr) {
          const { data: existingConvo } = await admin
            .from("conversations")
            .select("id")
            .eq("brand_id", invite.brand_id)
            .eq("creator_id", newUserId)
            .maybeSingle();
          conversationId = existingConvo?.id || null;
        } else {
          conversationId = convo.id;
        }

        if (conversationId) {
          await admin.from("messages").insert({
            conversation_id: conversationId,
            sender_id: brandRow.owner_user_id,
            content: welcomeText,
            message_type: "text",
          });
        }

        // Add to "Invited by us" saved list
        const listName = "Invited by us";
        const { data: existingList } = await admin
          .from("brand_saved_lists")
          .select("id")
          .eq("brand_id", invite.brand_id)
          .eq("name", listName)
          .maybeSingle();
        let listId = existingList?.id;
        if (!listId) {
          const { data: newList } = await admin
            .from("brand_saved_lists")
            .insert({ brand_id: invite.brand_id, name: listName })
            .select("id")
            .single();
          listId = newList?.id;
        }
        if (listId) {
          await admin
            .from("brand_saved_list_items")
            .insert({ list_id: listId, creator_id: newUserId })
            .then(
              () => null,
              () => null,
            );
        }
      }

      // Mark invite redeemed
      await admin
        .from("brand_creator_invites")
        .update({
          status: "redeemed",
          redeemed_by_user_id: newUserId,
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      return json({ success: true, email });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
