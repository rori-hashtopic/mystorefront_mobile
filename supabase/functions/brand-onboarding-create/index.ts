import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email,
      password,
      brand_name,
      website_url,
      category,
      commission_percent,
      refund_buffer_days,
      logo_url,
      access_code,
      validate_only,
    } = await req.json();

    // Server-side gate: reject requests without the shared access code so the
    // onboarding endpoint can't be scripted by anyone who discovers the URL.
    // The expected value never leaves the server — the client submits the code
    // typed by the user and only learns whether it was accepted.
    const expectedCode = Deno.env.get("ONBOARDING_ACCESS_CODE");
    if (!expectedCode || typeof access_code !== "string" || access_code.trim() !== expectedCode) {
      return new Response(JSON.stringify({ error: "Invalid access code" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (validate_only === true) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password || !brand_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(brand_name).trim();

    // Create user with email pre-confirmed -> no confirmation email sent.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role: "brand" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user!.id;

    await admin
      .from("profiles")
      .upsert({ id: userId, email: normalizedEmail, display_name: displayName }, { onConflict: "id" });

    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "brand" }, { onConflict: "user_id,role" });

    // Public endpoint: new brand accounts start as 'pending' and require admin
    // approval to prevent mass creation of approved brand-privileged accounts.
    const { data: inserted, error: insertError } = await admin.from("brand_accounts").insert({
      owner_user_id: userId,
      name: displayName,
      status: "pending",
      website_url: website_url ?? null,
      category: category ?? null,
      commission_percent: commission_percent ?? null,
      refund_buffer_days: refund_buffer_days ?? 30,
      logo_url: logo_url ?? null,
      logo_upload_url: logo_url ?? null,
    }).select("id").single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user_id: userId, brand_id: inserted?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
