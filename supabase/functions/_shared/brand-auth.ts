// Shared helpers for edge functions that touch brand integration settings.
// - assertBrandOwner: validates the caller's JWT and confirms they own brand_id.
// - assertSafeExternalUrl: rejects non-https URLs and blocks SSRF to private ranges.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type OwnerCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function assertBrandOwner(req: Request, brandId: string): Promise<OwnerCheck> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
    return { ok: false, status: 401, error: "Missing authorization" };
  }
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimsData, error } = await authClient.auth.getClaims(jwt);
  const userId = claimsData?.claims?.sub;
  if (error || !userId) {
    return { ok: false, status: 401, error: "Invalid session" };
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: brand } = await admin
    .from("brand_accounts")
    .select("owner_user_id")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand || brand.owner_user_id !== userId) {
    return { ok: false, status: 403, error: "Not authorized for this brand" };
  }
  return { ok: true, userId };
}

// Reject non-https URLs and hostnames that resolve to loopback / private / link-local
// / metadata addresses. Basic IP-literal parsing covers the common SSRF pivots
// without depending on DNS resolution.
export function assertSafeExternalUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "URL must use https://" };

  const host = url.hostname.toLowerCase();

  // Disallow bare hostnames used for local services.
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, error: "URL host not allowed" };
  }

  // IPv4 literal check
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
    const isPrivate =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) || // link-local / metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224; // multicast + reserved
    if (isPrivate) return { ok: false, error: "URL host not allowed" };
  }

  // IPv6 literal check — reject any bracketed IPv6 to be safe.
  if (host.startsWith("[") || host.includes(":")) {
    return { ok: false, error: "URL host not allowed" };
  }

  return { ok: true, url };
}
