# Remove QC preview functionality

Strip out the preview-only "QC" tooling: the floating QC route navigator, the fake QC onboarding route, and the preview host role-override that makes any preview visitor appear as creator/brand/admin/shopper based on URL path.

## Changes

1. Delete `src/components/QCNavigator.tsx`, `src/pages/QCOnboarding.tsx`, and `src/lib/qcPreview.ts`.
2. `src/App.tsx` — remove the `QCNavigator` import and render, the `QCOnboarding` lazy import, and the `/qc/onboarding` route.
3. `src/hooks/useUserRole.ts` — remove `getQcRoleOverride` and the preview-host override; the hook returns the real role from the database only.
4. `src/components/onboarding/OnboardingWizard.tsx` — remove the now-unused `previewMode` prop and always run the real completion path.
5. `supabase/functions/instagram-oauth-start/index.ts` and `instagram-oauth-callback/index.ts` — drop `/qc/onboarding` from the allowed redirect origins list, then redeploy both functions.

Note: `/qc` stays in the reserved-username list in the existing migration (no change needed, it just keeps the word unusable as a username).

## Effect

Roles are always resolved from the backend, and no preview-only navigator or onboarding shortcut is shipped.
