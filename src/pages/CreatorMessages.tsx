import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useConversations } from "@/hooks/useConversations";
import { useProfile } from "@/hooks/useProfile";
import { useMessageRequests } from "@/hooks/useMessageRequests";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageRequestsList } from "@/components/messaging/MessageRequestsList";
import { RequestToBrandModal } from "@/components/messaging/RequestToBrandModal";
import { ChatView } from "@/components/messaging/ChatView";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Lock, ArrowUp, ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { hasTierAccess } from "@/lib/creatorTiers";

export default function CreatorMessages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { profile, loading: profileLoading } = useProfile();
  const { conversations, loading: convoLoading } = useConversations("creator");
  const { requests, loading: reqLoading, sendRequest } = useMessageRequests("creator");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (!roleLoading && role && role !== "creator") navigate("/");
  }, [role, roleLoading]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowChat(true);
  };

  const handleMobileBack = () => {
    setMobileShowChat(false);
  };

  const selectedConvo = conversations.find((c) => c.id === selectedId);
  const tier = profile?.tier || "enthusiast";
  const canRequestBrands = hasTierAccess(tier, "trendsetter");

  const existingRequestBrandIds = requests.map((r) => r.brand_id);

  if (authLoading || roleLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      tier={profile?.tier || "enthusiast"}
      displayName={profile?.display_name || undefined}
      instagramConnected={profile?.instagram_connected || false}
      tiktokConnected={profile?.tiktok_connected || false}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header - hide on mobile when viewing chat */}
        <div
          className={`flex items-start sm:items-center justify-between gap-3 ${mobileShowChat ? "hidden sm:flex" : "flex"}`}
        >
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Messages</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">
              View messages and partnership briefs from brands.
            </p>
          </div>
          <Button
            onClick={() => canRequestBrands && setShowRequestModal(true)}
            variant="outline"
            size="sm"
            disabled={!canRequestBrands}
            className={`shrink-0 ${!canRequestBrands ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!canRequestBrands ? "Unlock at Tastemaker tier" : undefined}
          >
            {!canRequestBrands && <Lock className="h-3.5 w-3.5 mr-1.5" />}
            {canRequestBrands && <Send className="h-4 w-4 mr-1.5" />}
            <span className="hidden sm:inline">Request to Message</span>
            <span className="sm:hidden">Request</span>
            {!canRequestBrands && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide hidden sm:inline">Tastemaker</span>
            )}
          </Button>
        </div>

        {/* Mobile: Chat header with back button */}
        {mobileShowChat && selectedConvo && (
          <div className="flex items-center gap-3 sm:hidden">
            <Button variant="ghost" size="sm" onClick={handleMobileBack} className="shrink-0 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {selectedConvo.brand_logo && (
                <img src={selectedConvo.brand_logo} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
              )}
              <span className="font-medium text-sm text-foreground truncate">
                {selectedConvo.brand_name || "Brand"}
              </span>
            </div>
          </div>
        )}

        <Card className="overflow-hidden">
          {/* Desktop: side-by-side layout */}
          <div className="hidden md:grid md:grid-cols-[360px_1fr] min-h-[500px] h-[calc(100vh-280px)]">
            {/* Sidebar */}
            <div className="border-r border-border overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <TabsList className="w-full rounded-none border-0 border-b border-border bg-transparent p-0 h-auto shrink-0 gap-0">
                  <TabsTrigger
                    value="inbox"
                    className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors"
                  >
                    Inbox
                  </TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors"
                  >
                    My Requests
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="flex-1 overflow-hidden mt-0">
                  <ConversationList
                    conversations={conversations}
                    loading={convoLoading}
                    selectedId={selectedId}
                    onSelect={handleSelectConversation}
                    viewAs="creator"
                  />
                </TabsContent>

                <TabsContent value="requests" className="flex-1 overflow-hidden mt-0">
                  <MessageRequestsList requests={requests} loading={reqLoading} viewAs="creator" />
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat Area */}
            <div className="overflow-hidden">
              {selectedId && selectedConvo ? (
                <ChatView
                  conversationId={selectedId}
                  partnerName={selectedConvo.brand_name || "Brand"}
                  partnerPhoto={selectedConvo.brand_logo || null}
                  canSendBrief={false}
                  brandId={selectedConvo.brand_id}
                  creatorId={selectedConvo.creator_id}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Brands will reach out here with messages and promotional briefs, or request to message a brand
                    directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: full-screen list OR chat */}
          <div className="md:hidden">
            {!mobileShowChat ? (
              <div className="flex flex-col h-[calc(100vh-140px)] min-h-[400px]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                  <TabsList className="w-full rounded-none border-0 border-b border-border bg-transparent p-0 h-auto shrink-0 gap-0">
                    <TabsTrigger
                      value="inbox"
                      className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors"
                    >
                      Inbox
                    </TabsTrigger>
                    <TabsTrigger
                      value="requests"
                      className="flex-1 rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none py-3 text-xs uppercase tracking-wider transition-colors"
                    >
                      My Requests
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbox" className="flex-1 overflow-hidden mt-0">
                    <ConversationList
                      conversations={conversations}
                      loading={convoLoading}
                      selectedId={selectedId}
                      onSelect={handleSelectConversation}
                      viewAs="creator"
                    />
                  </TabsContent>

                  <TabsContent value="requests" className="flex-1 overflow-hidden mt-0">
                    <MessageRequestsList requests={requests} loading={reqLoading} viewAs="creator" />
                  </TabsContent>
                </Tabs>
              </div>
            ) : selectedId && selectedConvo ? (
              <div className="h-[calc(100vh-140px)] min-h-[400px]">
                <ChatView
                  conversationId={selectedId}
                  partnerName={selectedConvo.brand_name || "Brand"}
                  partnerPhoto={selectedConvo.brand_logo || null}
                  canSendBrief={false}
                  brandId={selectedConvo.brand_id}
                  creatorId={selectedConvo.creator_id}
                />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <RequestToBrandModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSendRequest={sendRequest}
        existingRequestBrandIds={existingRequestBrandIds}
      />
    </DashboardLayout>
  );
}
