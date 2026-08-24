import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PayoutRequest {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  payout_account_id: string;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
}

export function usePayoutRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payout requests:", error);
    } else {
      setRequests((data as PayoutRequest[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const requestPayout = async (amount: number, payoutAccountId: string) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase.from("payout_requests").insert({
      creator_id: user.id,
      amount,
      payout_account_id: payoutAccountId,
    } as any);

    if (!error) {
      await fetchRequests();
    }
    return { error };
  };

  return { requests, loading, requestPayout, refetch: fetchRequests };
}
