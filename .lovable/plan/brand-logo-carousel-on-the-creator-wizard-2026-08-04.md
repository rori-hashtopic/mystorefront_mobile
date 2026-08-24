# Brand logo carousel on the creator wizard

## What's happening now

The welcome step of the creator wizard already renders a scrolling logo strip above "Hi, Preview Creator", and it already excludes Captured By Mel and HashTopic. It shows nothing because the query it uses is blocked: reading the brand accounts table directly is denied for visitors who aren't signed in (confirmed by a live request returning "permission denied"), so the list comes back empty and the strip is hidden.

Only 5 real brands have logos today: Crafty Goodies, Dex The Label, Orphan Street Clothing Shop, PrimeState, shade&Co.

## The fix

1. Add a small read-only database function that returns just brand name + logo for approved brands, excluding the two test accounts. It runs with elevated rights so it works both in the QC preview (signed out) and during real onboarding (signed in), while exposing nothing beyond names and logo URLs.
2. Point the welcome step at that function instead of querying the table directly.
3. Keep the existing visual treatment (grayscale, low opacity, seamless infinite scroll, duplicated track) and the "Brands on MyStorefront" label, matching the editorial aesthetic.
4. Duplicate the logo list enough times that a small set (5 logos) still fills the track without visible gaps.

## Technical notes

- New migration: `public.get_public_brand_logos()` — SECURITY DEFINER, STABLE, `search_path = public`, returns `(name text, logo_url text)` filtered to `status = 'approved'`, logo present, and `name not in ('Captured By Mel','HashTopic')`, preferring `logo_upload_url` over `logo_url`. Grant EXECUTE to `anon` and `authenticated`.
- `src/components/onboarding/steps/WelcomeStep.tsx`: swap `supabase.from("brand_accounts").select(...)` for `supabase.rpc("get_public_brand_logos")`; drop the now-redundant client-side exclude list only where the RPC already handles it (keep a defensive filter for empty URLs).
- No changes to wizard steps, layout, or copy.
