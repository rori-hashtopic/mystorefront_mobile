import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const SUPABASE_URL = "https://lhzqnkrjqaebcfxcmlgd.supabase.co";

export default function WelcomeRedirect() {
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("t");
    const redirect = params.get("r") || "https://mystorefront.io/auth/callback";
    if (!token) return;
    const url = `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(
      token
    )}&type=magiclink&redirect_to=${encodeURIComponent(redirect)}`;
    window.location.replace(url);
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-6">
        <h1 className="font-serif text-3xl mb-3">Welcome to MyStorefront</h1>
        <p className="text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
