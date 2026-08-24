// Email allowlist for the Paid Collabs beta. Brand owners whose auth email is
// in this list see Paid Collabs unlocked; everyone else sees the "coming soon"
// lock and is redirected away from /brand/paid-collabs.
const PAID_COLLABS_ALLOWED_EMAILS = new Set<string>([
  "roxi@hashtopic.co.za",
  "capturedbymelofficial@gmail.com",
]);

export function canAccessPaidCollabs(email?: string | null): boolean {
  if (!email) return false;
  return PAID_COLLABS_ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
