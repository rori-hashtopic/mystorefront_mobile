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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller using getClaims
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("getClaims failed:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, display_name, password, role: requestedRole } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRole = (requestedRole === "brand" || requestedRole === "creator") ? requestedRole : "creator";
    const fallbackDisplayName = display_name?.trim() || normalizedEmail.split("@")[0];

    // Create auth user (with optional password)
    const createUserOptions: any = {
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        display_name: fallbackDisplayName,
        role: userRole,
      },
    };
    if (password && typeof password === "string" && password.length >= 6) {
      createUserOptions.password = password;
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser(createUserOptions);

    let userId: string;

    if (createError) {
      // If user already exists, look them up through a service-only RPC.
      // listUsers can fail on some projects with many auth rows, which caused
      // existing users to be impossible to re-add as creators.
      const msg = createError.message?.toLowerCase() ?? "";
      const alreadyExists =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate");

      if (alreadyExists) {
        const { data: existing, error: lookupError } = await adminClient
          .rpc("admin_find_auth_user_by_email", { p_email: normalizedEmail })
          .maybeSingle();

        if (lookupError) {
          console.error("Existing user lookup failed:", lookupError);
          return new Response(JSON.stringify({ error: "Could not look up existing user" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!existing?.id) {
          console.error("User reported as existing but not found", { email: normalizedEmail });
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;

        // Update password if provided
        if (password && typeof password === "string" && password.length >= 6) {
          await adminClient.auth.admin.updateUserById(userId, { password });
        }
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user.id;
    }

    // Ensure a profile exists for users created before the profiles trigger existed.
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: normalizedEmail,
        display_name: fallbackDisplayName,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Failed to ensure profile:", profileError);
      return new Response(JSON.stringify({ error: "Failed to create creator profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign the role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: userRole,
      }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Failed to assign role:", roleError);
      return new Response(JSON.stringify({ error: "Failed to assign creator role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the action
    await adminClient.from("admin_logs").insert({
      admin_user_id: callerId,
      action: "create_creator",
      details: { email: normalizedEmail, user_id: userId, display_name },
    });

    return new Response(
      JSON.stringify({ user_id: userId, email: normalizedEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
