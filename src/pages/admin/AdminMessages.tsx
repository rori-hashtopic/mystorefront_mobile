import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ChatView } from "@/components/messaging/ChatView";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminConversation {
  id: string;
  brand_id: string;
  creator_id: string;
  updated_at: string;
  brand_name: string;
  brand_logo: string | null;
  creator_name: string;
  creator_photo: string | null;
  last_message?: string;
  unread_count: number;
}

export default function AdminMessages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") navigate("/");
  }, [role, roleLoading]);

  useEffect(() => {
    if (!user || role !== "admin") return;

    async function fetchConversations() {
      setLoading(true);
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("id, brand_id, creator_id, updated_at")
        .order("updated_at", { ascending: false });

      if (error || !convos) {
        console.error("Error fetching conversations:", error);
        setLoading(false);
        return;
      }

      const brandIds = [...new Set(convos.map((c) => c.brand_id))];
      const creatorIds = [...new Set(convos.map((c) => c.creator_id))];

      const [brandsRes, creatorsRes] = await Promise.all([
        supabase.from("brand_accounts").select("id, name, logo_url").in("id", brandIds),
        supabase.from("public_profiles").select("id, display_name, photo_url").in("id", creatorIds),
      ]);

      const brandsMap = new Map((brandsRes.data || []).map((b) => [b.id, b]));
      const creatorsMap = new Map((creatorsRes.data || []).map((c) => [c.id, c]));

      // Get last message per conversation
      const lastMessages = await Promise.all(
        convos.map((c) =>
          supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      );

      const mapped: AdminConversation[] = convos.map((c, i) => {
        const brand = brandsMap.get(c.brand_id);
        const creator = creatorsMap.get(c.creator_id);
        return {
          id: c.id,
          brand_id: c.brand_id,
          creator_id: c.creator_id,
          updated_at: c.updated_at,
          brand_name: brand?.name || "Unknown Brand",
          brand_logo: brand?.logo_url || null,
          creator_name: creator?.display_name || "Unknown Creator",
          creator_photo: creator?.photo_url || null,
          last_message: lastMessages[i]?.data?.content || "",
          unread_count: 0,
        };
      });

      setConversations(mapped);
      setLoading(false);
    }

    fetchConversations();
  }, [user, role]);

  const selected = conversations.find((c) => c.id === selectedId);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            View all conversations between brands and creators.
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] min-h-[500px] h-[calc(100vh-280px)]">
            {/* Sidebar */}
            <div className="border-r border-border overflow-hidden flex flex-col">
              <div className="border-b border-border px-4 py-3 shrink-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  All Conversations ({conversations.length})
                </p>
              </div>
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                        selectedId === c.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex -space-x-2 shrink-0">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={c.brand_logo || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {c.brand_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={c.creator_photo || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {c.creator_name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">
                              {c.brand_name}
                            </span>
                            <span className="text-xs text-muted-foreground">↔</span>
                            <span className="text-sm font-medium text-foreground truncate">
                              {c.creator_name}
                            </span>
                          </div>
                          {c.last_message && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {c.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="overflow-hidden">
              {selectedId && selected ? (
                <ChatView
                  conversationId={selectedId}
                  partnerName={`${selected.brand_name} ↔ ${selected.creator_name}`}
                  partnerPhoto={null}
                  canSendBrief={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    View any conversation between brands and creators.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
