import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { useConversations, useConversationActions } from "@/hooks/useConversations";
import { useMessageRequests } from "@/hooks/useMessageRequests";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { TierBanner } from "@/components/brand/TierBanner";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageRequestsList } from "@/components/messaging/MessageRequestsList";
import { ChatView } from "@/components/messaging/ChatView";
import { NewMessageModal } from "@/components/messaging/NewMessageModal";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2, Inbox, Check, X, PenSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BrandMessages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand: brandAccount } = useBrandAccount();
  const { conversations, loading: convoLoading, refetch } = useConversations("brand");
  const { archiveConversation, unarchiveConversation, deleteConversation } = useConversationActions();
  const { requests, loading: reqLoading, respondToRequest, refetch: refetchRequests } = useMessageRequests("brand");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [creatingConvo, setCreatingConvo] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const creatorIdParam = searchParams.get("creator");
  const conversationParam = searchParams.get("conversation");
  const messageParam = searchParams.get("message");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading]);

  // Handle conversation param — open specific conversation
  useEffect(() => {
    if (conversationParam && !convoLoading) {
      setSelectedId(conversationParam);
      // Scroll to specific message after a short delay
      if (messageParam) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${messageParam}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
      }
    }
  }, [conversationParam, messageParam, convoLoading]);

  // Handle creator param — find or create conversation
  useEffect(() => {
    if (!creatorIdParam || !brandAccount || convoLoading || creatingConvo) return;

    const existing = conversations.find((c) => c.creator_id === creatorIdParam);
    if (existing) {
      setSelectedId(existing.id);
      setSearchParams({}, { replace: true });
      return;
    }

    // Create new conversation
    setCreatingConvo(true);
    supabase
      .from("conversations")
      .insert({
        brand_id: brandAccount.id,
        creator_id: creatorIdParam,
      })
      .select()
      .single()
      .then(async ({ data, error }) => {
        if (data) {
          setSelectedId(data.id);
          await refetch();
        }
        if (error) {
          console.error("Error creating conversation:", error);
        }
        setSearchParams({}, { replace: true });
        setCreatingConvo(false);
      });
  }, [creatorIdParam, brandAccount, conversations, convoLoading]);

  const activeConversations = useMemo(() => conversations.filter((c) => !c.archived_by_brand), [conversations]);
  const archivedConversations = useMemo(() => conversations.filter((c) => c.archived_by_brand), [conversations]);

  const selectedConvo = conversations.find((c) => c.id === selectedId);
  const showMobileChat = Boolean(selectedId || (activeTab === "requests" && selectedRequestId));

  const pendingRequestCount = requests.filter((r) => r.status === "pending").length;

  const handleArchive = async (id: string) => {
    const { error } = await archiveConversation(id);
    if (error) {
      toast.error("Failed to archive conversation");
      return;
    }
    toast.success("Conversation archived");
    if (selectedId === id) setSelectedId(null);
    refetch();
  };

  const handleUnarchive = async (id: string) => {
    const { error } = await unarchiveConversation(id);
    if (error) {
      toast.error("Failed to unarchive conversation");
      return;
    }
    toast.success("Conversation restored");
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteConversation(id);
    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }
    toast.success("Conversation deleted");
    if (selectedId === id) setSelectedId(null);
    refetch();
  };

  const handleConversationCreated = async (conversationId: string) => {
    await refetch();
    await refetchRequests();
    setActiveTab("conversations");
    setSelectedId(conversationId);
    setSelectedRequestId(null);
  };

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const TIER_LABELS: Record<string, string> = {
    enthusiast: "Insider",
    ambassador: "Featured",
    trendsetter: "Tastemaker",
    icon: "Tastemaker",
  };

  const handleRespondFromPreview = async (status: "accepted" | "declined") => {
    if (!selectedRequest) return;
    setRespondingId(selectedRequest.id);
    const result = await respondToRequest(
      selectedRequest.id,
      status,
      selectedRequest.creator_id,
      selectedRequest.brand_id,
    );
    if (result.error) {
      // toast handled in list
    } else if (status === "accepted" && result.conversationId) {
      handleConversationCreated(result.conversationId);
    }
    setRespondingId(null);
    await refetchRequests();
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BrandLayout brandName={brandAccount?.name} brandStatus={brandAccount?.status} brandPlan={brandAccount?.plan_tier}>
      <div className="space-y-4 md:space-y-6">
        <TierBanner tier="premium" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Messages</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage conversations with creators and review new requests.
            </p>
          </div>
          <Button onClick={() => setNewMessageOpen(true)} className="shrink-0 gap-2 w-full sm:w-auto">
            <PenSquare className="h-4 w-4" />
            New message
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] h-[calc(100dvh-220px)] md:h-[calc(100vh-280px)] md:min-h-[500px]">
            {/* Sidebar with Tabs */}
            <div
              className={`border-border overflow-hidden flex-col md:border-r ${
                showMobileChat ? "hidden md:flex" : "flex"
              }`}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <TabsList className="w-full rounded-none border-0 border-b border-border bg-transparent p-0 h-auto shrink-0 gap-0">
                  <TabsTrigger
                    value="conversations"
                    className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors"
                  >
                    Conversations
                  </TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors gap-1.5"
                  >
                    Requests
                    {pendingRequestCount > 0 && (
                      <Badge className="h-5 min-w-5 flex items-center justify-center text-[10px] rounded-full bg-foreground text-background">
                        {pendingRequestCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="archived"
                    className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors gap-1.5"
                  >
                    Archived
                    {archivedConversations.length > 0 && (
                      <Badge
                        variant="outline"
                        className="h-5 min-w-5 flex items-center justify-center text-[10px] rounded-full ml-1"
                      >
                        {archivedConversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="conversations" className="flex-1 overflow-hidden mt-0">
                  <ConversationList
                    conversations={activeConversations}
                    loading={convoLoading || creatingConvo}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                    viewAs="brand"
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                </TabsContent>

                <TabsContent value="archived" className="flex-1 overflow-hidden mt-0">
                  <ConversationList
                    conversations={archivedConversations}
                    loading={convoLoading}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                    viewAs="brand"
                    showArchived
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                </TabsContent>

                <TabsContent value="requests" className="flex-1 overflow-hidden mt-0">
                  <MessageRequestsList
                    requests={requests}
                    loading={reqLoading}
                    viewAs="brand"
                    onRespond={respondToRequest}
                    onConversationCreated={handleConversationCreated}
                    selectedRequestId={selectedRequestId}
                    onSelectRequest={(id) => {
                      setSelectedRequestId(id);
                      setSelectedId(null);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat / Preview Area */}
            <div className={`overflow-hidden ${showMobileChat ? "flex md:flex" : "hidden md:flex"} flex-col`}>
              {selectedId && selectedConvo ? (
                <ChatView
                  conversationId={selectedId}
                  partnerName={selectedConvo.creator_name || "Creator"}
                  partnerPhoto={selectedConvo.creator_photo || null}
                  canSendBrief={true}
                  brandId={brandAccount?.id}
                  creatorId={selectedConvo.creator_id}
                  onBack={() => setSelectedId(null)}
                />
              ) : selectedId && !selectedConvo ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeTab === "requests" && selectedRequest ? (
                <div className="flex flex-col h-full">
                  {/* Request Preview Header */}
                  <div className="border-b border-border p-4 flex items-center gap-3 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -ml-2 md:hidden shrink-0"
                      onClick={() => setSelectedRequestId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedRequest.creator_photo || undefined} />
                      <AvatarFallback className="text-xs">
                        {selectedRequest.creator_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {selectedRequest.creator_name}
                        </span>
                        {selectedRequest.creator_tier && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {TIER_LABELS[selectedRequest.creator_tier] || selectedRequest.creator_tier}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Message Request</p>
                    </div>
                  </div>

                  {/* Full Message */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedRequest.message}
                    </p>
                  </div>

                  {/* Actions */}
                  {selectedRequest.status === "pending" && (
                    <div className="border-t border-border p-4 flex items-center gap-3 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRespondFromPreview("accepted")}
                        disabled={respondingId === selectedRequest.id}
                      >
                        {respondingId === selectedRequest.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Accept & Start Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondFromPreview("declined")}
                        disabled={respondingId === selectedRequest.id}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {selectedRequest.status !== "pending" && (
                    <div className="border-t border-border p-4 shrink-0">
                      <Badge
                        className={
                          selectedRequest.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {selectedRequest.status === "accepted" ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  {activeTab === "requests" ? (
                    <>
                      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-1">Creator Requests</h3>
                      <p className="text-sm text-muted-foreground">Click a request to preview the full message.</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-1">Select a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation or message a creator from the directory.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <NewMessageModal
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        onSelect={(creatorId) => {
          setActiveTab("conversations");
          setSearchParams({ creator: creatorId }, { replace: true });
        }}
      />
    </BrandLayout>
  );
}
