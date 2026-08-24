import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      navigate(`/settings?instagram_error=${encodeURIComponent(errorDescription || error)}`, { replace: true });
      return;
    }

    if (!code || !state) {
      navigate("/settings?instagram_error=missing_parameters", { replace: true });
      return;
    }

    const exchange = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("instagram-oauth-callback", {
          body: { code, state },
        });

        if (fnError || !data?.success) {
          const msg = data?.details || data?.error || fnError?.message || "unexpected_error";
          setErrorMsg(msg);
          setStatus("error");
          setTimeout(() => {
            navigate(`/settings?instagram_error=${encodeURIComponent(msg)}`, { replace: true });
          }, 2000);
          return;
        }

        const destination = data.origin || "/settings";
        const separator = destination.includes("?") ? "&" : "?";
        navigate(`${destination}${separator}instagram_connected=true`, { replace: true });
      } catch (err: any) {
        const msg = err?.message || "unexpected_error";
        setErrorMsg(msg);
        setStatus("error");
        setTimeout(() => {
          navigate(`/settings?instagram_error=${encodeURIComponent(msg)}`, { replace: true });
        }, 2000);
      }
    };

    exchange();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      {status === "loading" ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting your Instagram account...</p>
        </>
      ) : (
        <>
          <p className="text-destructive">{errorMsg}</p>
          <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
        </>
      )}
    </div>
  );
};

export default InstagramCallback;
