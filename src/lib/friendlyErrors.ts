/**
 * Translate raw Supabase / Postgres errors into clear, user-facing messages.
 * Pass any caught error; returns a friendly description string.
 */
export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;

  const err = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const raw = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  const code = err.code;

  // Unique constraint violations (Postgres 23505)
  if (code === "23505" || raw.includes("duplicate key") || raw.includes("unique constraint")) {
    if (raw.includes("profiles_username_key") || raw.includes("username")) {
      return "That username is already taken. Please choose a different one.";
    }
    if (raw.includes("email")) {
      return "That email address is already in use.";
    }
    if (raw.includes("slug")) {
      return "That URL is already taken. Please choose a different one.";
    }
    return "That value is already in use. Please try a different one.";
  }

  // Not-null violations (23502)
  if (code === "23502" || raw.includes("violates not-null")) {
    return "Please fill in all required fields.";
  }

  // Foreign key violations (23503)
  if (code === "23503" || raw.includes("violates foreign key")) {
    return "That selection is no longer available. Please refresh and try again.";
  }

  // Check constraint violations (23514)
  if (code === "23514" || raw.includes("violates check constraint")) {
    return "Some of the information you entered isn't valid. Please review and try again.";
  }

  // Row-level security / permission
  if (code === "42501" || raw.includes("row-level security") || raw.includes("permission denied")) {
    return "You don't have permission to do that.";
  }

  // Network
  if (raw.includes("failed to fetch") || raw.includes("networkerror")) {
    return "Network error. Please check your connection and try again.";
  }

  // Auth
  if (raw.includes("jwt") || raw.includes("not authenticated")) {
    return "Your session has expired. Please sign in again.";
  }

  // If we have a non-technical message, surface it; otherwise fall back.
  const message = err.message?.trim();
  if (message && !/[_{}]|violates|constraint|sql|pgrst|jwt/i.test(message)) {
    return message;
  }
  return fallback;
}
