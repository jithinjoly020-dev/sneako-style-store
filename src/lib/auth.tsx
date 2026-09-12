import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function isStaleRefreshTokenError(message?: string | null) {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("refresh token") && (m.includes("already used") || m.includes("not found") || m.includes("invalid"));
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      // INITIAL_SESSION / SIGNED_IN / SIGNED_OUT all mean auth is resolved.
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error && isStaleRefreshTokenError(error.message)) {
          // Stale saved session — clear it so the app stops hanging.
          void supabase.auth.signOut({ scope: "local" });
          setSession(null);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    // Safety net: never stay on the loading screen longer than 6s.
    const timeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  return { session, user: (session?.user ?? null) as User | null, loading, isAdmin };
}
