import { useState } from "react";
import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Inbox, Check, X, Gift, Tag, Megaphone } from "lucide-react";
import { format } from "date-fns";
import {
  demoConversations,
  demoMessageRequests,
  getCreator,
  formatZAR,
  DemoMessage,
  DemoConversation,
} from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

export default function DemoBrandMessages() {
  const { demoAction } = useDemoMode();
  const [selectedId, setSelectedId] = useState<string | null>(demoConversations[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState("conversations");

  const selected = demoConversations.find((c) => c.id === selectedId);

  const handleSend = () => {
    if (!draft.trim()) return;
    setDraft("");
    demoAction("Demo mode — message not sent.");
  };

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="paid" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Manage conversations with creators and review new requests.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="conversations">
              Conversations{" "}
              <Badge variant="secondary" className="ml-2">
                {demoConversations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests{" "}
              <Badge variant="secondary" className="ml-2">
                {demoMessageRequests.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-6">
            <Card className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[600px]">
                {/* Conversation list */}
                <div className="border-r border-border divide-y divide-border overflow-y-auto max-h-[600px]">
                  {demoConversations.map((conv) => {
                    const c = getCreator(conv.creator_id);
                    const last = conv.messages[conv.messages.length - 1];
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors ${
                          selectedId === conv.id ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={c?.photo_url || undefined} />
                            <AvatarFallback>{c?.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm text-foreground truncate">
                                {c?.display_name}
                              </p>
                              {conv.unread > 0 && (
                                <span className="h-4 min-w-4 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium px-1">
                                  {conv.unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {last.message_type === "text"
                                ? last.content
                                : `📎 ${labelForType(last.message_type)}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Chat */}
                {selected ? (
                  <ChatPanel
                    conversation={selected}
                    draft={draft}
                    setDraft={setDraft}
                    onSend={handleSend}
                  />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground p-12">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="space-y-3">
              {demoMessageRequests.map((req) => {
                const c = getCreator(req.creator_id);
                return (
                  <Card key={req.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c?.photo_url || undefined} />
                        <AvatarFallback>{c?.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{c?.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              @{c?.instagram_username} ·{" "}
                              {c?.follower_count.toLocaleString()} followers
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(req.created_at), "dd MMM")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-2">{req.message}</p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => demoAction("Demo — request accepted (not saved).")}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => demoAction("Demo — request declined (not saved).")}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {demoMessageRequests.length === 0 && (
                <Card className="p-12 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2" />
                  <p>No new requests.</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DemoBrandLayout>
  );
}

function labelForType(t: DemoMessage["message_type"]): string {
  switch (t) {
    case "brief":
      return "Partnership brief";
    case "gift_offer":
      return "Gift offer";
    case "discount_code":
      return "Discount code";
    case "mention_request":
      return "Mention request";
    default:
      return "Attachment";
  }
}

function ChatPanel({
  conversation,
  draft,
  setDraft,
  onSend,
}: {
  conversation: DemoConversation;
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
}) {
  const c = getCreator(conversation.creator_id);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={c?.photo_url || undefined} />
          <AvatarFallback>{c?.display_name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm text-foreground">{c?.display_name}</p>
          <p className="text-xs text-muted-foreground">@{c?.instagram_username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[460px]">
        {conversation.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <Button onClick={onSend} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: DemoMessage }) {
  const isBrand = m.sender === "brand";
  const wrapper = `flex ${isBrand ? "justify-end" : "justify-start"}`;
  const bubble = `max-w-[75%] rounded-2xl px-4 py-2 ${
    isBrand ? "bg-foreground text-background" : "bg-secondary text-foreground"
  }`;

  if (m.message_type === "text") {
    return (
      <div className={wrapper}>
        <div className={bubble}>
          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
          <p className={`text-[10px] mt-1 ${isBrand ? "opacity-70" : "text-muted-foreground"}`}>
            {format(new Date(m.created_at), "HH:mm")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Card className="max-w-[80%] p-3 border-2">
        <div className="flex items-center gap-2 mb-2">
          {m.message_type === "brief" && <Megaphone className="h-4 w-4" />}
          {m.message_type === "gift_offer" && <Gift className="h-4 w-4" />}
          {m.message_type === "discount_code" && <Tag className="h-4 w-4" />}
          {m.message_type === "mention_request" && <Megaphone className="h-4 w-4" />}
          <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            {labelForType(m.message_type)}
          </span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {m.meta?.status || "—"}
          </Badge>
        </div>
        <p className="font-medium text-sm text-foreground">{m.content}</p>
        {m.meta && (
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            {m.meta.deliverables && (
              <div>
                <p className="text-muted-foreground">Deliverables</p>
                <p className="text-foreground">{m.meta.deliverables}</p>
              </div>
            )}
            {m.meta.fee != null && (
              <div>
                <p className="text-muted-foreground">Fee</p>
                <p className="text-foreground">{formatZAR(m.meta.fee)}</p>
              </div>
            )}
            {m.meta.deadline && (
              <div>
                <p className="text-muted-foreground">Deadline</p>
                <p className="text-foreground">{m.meta.deadline}</p>
              </div>
            )}
            {m.meta.product && (
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="text-foreground">{m.meta.product}</p>
              </div>
            )}
            {m.meta.value != null && (
              <div>
                <p className="text-muted-foreground">Value</p>
                <p className="text-foreground">{formatZAR(m.meta.value)}</p>
              </div>
            )}
            {m.meta.code && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Code</p>
                <p className="font-mono font-semibold text-foreground">{m.meta.code}</p>
              </div>
            )}
            {m.meta.discount_value && (
              <div>
                <p className="text-muted-foreground">Discount</p>
                <p className="text-foreground">
                  {m.meta.discount_type === "percentage"
                    ? `${m.meta.discount_value}%`
                    : formatZAR(m.meta.discount_value)}
                </p>
              </div>
            )}
            {m.meta.expiry && (
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="text-foreground">{m.meta.expiry}</p>
              </div>
            )}
          </div>
        )}
        <p className="text-[10px] mt-2 text-muted-foreground">
          {format(new Date(m.created_at), "dd MMM HH:mm")}
        </p>
      </Card>
    </div>
  );
}
