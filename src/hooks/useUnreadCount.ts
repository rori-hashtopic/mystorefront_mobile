import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    if (!user) { setCount(0); return; }

    // Get conversation IDs the user is part of
    const { data: convos } = await supabase
      .from("conversations")
      .select("id");

    if (!convos || convos.length === 0) { setCount(0); return; }

    const convoIds = convos.map((c) => c.id);

    const { count: unread } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setCount(unread || 0);
  };

  useEffect(() => {
    fetchCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
