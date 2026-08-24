import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        if (!res.ok) { setState("invalid"); return; }
        const data = await res.json();
        setState(data.valid === false && data.reason === "already_unsubscribed" ? "already" : data.valid ? "valid" : "invalid");
      } catch { setState("invalid"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) { setState("error"); } else if (data?.success) { setState("success"); } else if (data?.reason === "already_unsubscribed") { setState("already"); } else { setState("error"); }
    } catch { setState("error"); }
    setProcessing(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12 px-6 text-center space-y-4">
          {state === "loading" && <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />}
          {state === "valid" && (
            <>
              <MailX className="h-12 w-12 text-muted-foreground" />
              <h1 className="font-display text-2xl font-bold text-foreground">Unsubscribe</h1>
              <p className="text-muted-foreground">Are you sure you want to unsubscribe from app emails?</p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="mt-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <h1 className="font-display text-2xl font-bold text-foreground">Unsubscribed</h1>
              <p className="text-muted-foreground">You've been successfully unsubscribed from app emails.</p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground" />
              <h1 className="font-display text-2xl font-bold text-foreground">Already Unsubscribed</h1>
              <p className="text-muted-foreground">You've already unsubscribed from these emails.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="font-display text-2xl font-bold text-foreground">
                {state === "invalid" ? "Invalid Link" : "Something went wrong"}
              </h1>
              <p className="text-muted-foreground">
                {state === "invalid" ? "This unsubscribe link is invalid or has expired." : "Please try again later."}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
