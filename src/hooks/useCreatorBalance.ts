import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CreatorBalance {
  total_earned: number;
  locked_amount: number;
  paid_amount: number;
  available_balance: number;
}

export function useCreatorBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreatorBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_creator_balance", {
      p_creator_id: user.id,
    });

    if (error) {
      console.error("Error fetching balance:", error);
    } else if (data && data.length > 0) {
      setBalance(data[0] as CreatorBalance);
    } else {
      setBalance({ total_earned: 0, locked_amount: 0, paid_amount: 0, available_balance: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  return { balance, loading, refetch: fetchBalance };
}
