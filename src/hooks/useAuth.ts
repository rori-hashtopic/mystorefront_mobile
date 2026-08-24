import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didInit = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        // Only treat an explicit SIGNED_OUT event (or USER_DELETED) as a real
        // sign-out. For other events (TOKEN_REFRESHED, USER_UPDATED, etc.) a
        // momentarily-null session can occur while the SDK is refreshing —
        // do NOT clear the user in that case, otherwise the app will
        // incorrectly redirect users to /auth.
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (nextSession) {
          setSession(nextSession);
          setUser(nextSession.user);
          setLoading(false);
          return;
        }

        // No session on a non-sign-out event — keep the previous user in
        // place and just mark loading complete. The SDK will fire another
        // event once the refresh resolves.
        if (didInit) {
          if (import.meta.env.DEV) {
            console.debug("[useAuth] Ignoring null session for event:", event);
          }
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      didInit = true;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
