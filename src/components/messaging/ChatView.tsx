import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useMessages,
  BriefData,
  BriefStatus,
  MentionRequestData,
  GiftOfferData,
  DiscountCodeData,
  MessageType,
} from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  FileText,
  Loader2,
  Calendar,
  ClipboardList,
  Check,
  X,
  Play,
  Eye,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Plus,
  AlertTriangle,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CollabComposer } from "./CollabComposer";
import { PaidCollabCard } from "./PaidCollabCard";
import { MentionRequestCard } from "./MentionRequestCard";
import { GiftOfferCard } from "./GiftOfferCard";
import { DiscountCodeCard } from "./DiscountCodeCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ChatViewProps {
  conversationId: string;
  partnerName: string;
  partnerPhoto: string | null;
  canSendBrief: boolean;
  brandId?: string;
  creatorId?: string;
  onBack?: () => void;
}

type ComposerType =
  | "Gifting"
  | "Gifting + Deliverables"
  | "Paid Campaign"
  | "Paid Campaign + Gifting"
  | "Mention Request"
  | "Discount Code"
  | null;

interface PaidCollab {
  id: string;
  title: string;
  compensation_type: string;
  status: string;
  creator_ids: string[] | null;
}

export function ChatView({
  conversationId,
  partnerName,
  partnerPhoto,
  canSendBrief,
  brandId,
  creatorId,
  onBack,
}: ChatViewProps) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { messages, loading, sendMessage, updateBriefStatus, updateMessageData, deleteMessage } =
    useMessages(conversationId);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeComposer, setActiveComposer] = useState<ComposerType>(null);
  const [editingCollab, setEditingCollab] = useState<{ messageId: string; data: any } | null>(null);
  const [showAssignCollab, setShowAssignCollab] = useState(false);
  const [collabs, setCollabs] = useState<PaidCollab[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [creatorName, setCreatorName] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBrand = canSendBrief;

  useEffect(() => {
    if (!brandId) return;
    supabase
      .from("brand_accounts")
      .select("name")
      .eq("id", brandId)
      .maybeSingle()
      .then(({ data }) => setBrandName((data as any)?.name || ""));
  }, [brandId]);

  useEffect(() => {
    if (!creatorId) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", creatorId)
      .maybeSingle()
      .then(({ data }) => setCreatorName((data as any)?.display_name || ""));
  }, [creatorId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Presence: record that this user is looking at the conversation so the
  // unread-nudge job doesn't email someone who already has the chat open.
  useEffect(() => {
    if (!conversationId || !user) return;

    let cancelled = false;
    const touch = async () => {
      if (cancelled) return;
      await supabase.from("conversation_participant_state").upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" },
      );
    };

    touch();
    const interval = setInterval(touch, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, user, messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const result: any = await sendMessage(newMessage.trim());
    if (result?.flagged) {
      setModerationWarning(result.error);
    } else {
      setModerationWarning(null);
      setNewMessage("");
    }
    setSending(false);
  };

  const handleSendBrief = async (brief: BriefData) => {
    setSending(true);
    const result: any = await sendMessage(`📋 ${brief.title}`, "brief", brief);
    if (result?.flagged) {
      setModerationWarning(result.error);
    } else {
      setActiveComposer(null);
    }
    setSending(false);
  };

  const handleSendMentionRequest = async (data: MentionRequestData) => {
    setSending(true);
    const result: any = await sendMessage(`📢 Mention Request: ${data.campaign_title}`, "mention_request", data);
    if (result?.flagged) {
      setModerationWarning(result.error);
    } else {
      setActiveComposer(null);
    }
    setSending(false);
  };

  const handleSendGiftOffer = async (data: GiftOfferData) => {
    setSending(true);
    const result: any = await sendMessage(`🎁 Gift Offer: ${data.product_name}`, "gift_offer", data);
    if (result?.flagged) {
      setModerationWarning(result.error);
    } else {
      setActiveComposer(null);
    }
    setSending(false);
  };

  const handleSendDiscountCode = async (data: DiscountCodeData) => {
    setSending(true);
    const result: any = await sendMessage(`🏷️ Discount Code: ${data.code}`, "discount_code", data);
    if (result?.flagged) {
      setModerationWarning(result.error);
    } else {
      setActiveComposer(null);
    }
    setSending(false);
  };

  const handleUpdateMessageData = async (messageId: string, data: any) => {
    const msgBefore = messages.find((m) => m.id === messageId);
    const oldStatus = (msgBefore?.brief_data as any)?.status;
    const result = await updateMessageData(messageId, data);

    // Everything below announces the change — an in-chat system message and a
    // notification email — so none of it may run when the write didn't land.
    // Previously both fired regardless, so a failed acceptance still told both
    // parties it was accepted, and a failed gift acceptance still emailed the
    // brand the creator's home address.
    // Returns rather than throws: three of the four message cards call
    // setUpdating(false) after an unguarded await and would spin forever.
    if (result?.error) {
      console.error("Failed to update message data", result.error);
      toast.error("Could not save that change. Please try again.");
      return result;
    }

    // Status-change system messages removed — the collab/brief cards
    // already reflect the current status inline.

    // Send email notification for status changes
    if (data.status && user) {
      const msg = messages.find((m) => m.id === messageId);
      const oldData = msg?.brief_data as any;
      if (oldData && oldData.status !== data.status) {
        // Determine recipient: the other party
        const recipientUserId = isBrand ? creatorId : brandId ? undefined : undefined;
        const senderIsBrand = isBrand;

        // Determine which template to use based on message type
        if (msg?.message_type === "mention_request") {
          const mentionData = data as MentionRequestData;
          // Send to the other party
          const recipientId = senderIsBrand ? creatorId : undefined;
          if (recipientId) {
            supabase.functions
              .invoke("send-transactional-email", {
                body: {
                  templateName: "mention-status",
                  recipientUserId: recipientId,
                  idempotencyKey: `mention-status-${messageId}-${mentionData.status}`,
                  templateData: {
                    recipientRole: senderIsBrand ? "creator" : "brand",
                    campaignTitle: mentionData.campaign_title,
                    deliverableType: mentionData.deliverable_type,
                    feeAmount: mentionData.fee_amount,
                    status: mentionData.status,
                    brandNote: mentionData.brand_note,
                  },
                },
              })
              .catch(console.error);
          }
          // If creator is acting, notify brand owner
          if (!senderIsBrand && brandId) {
            supabase.rpc("get_brand_owner_user_id", { p_brand_id: brandId }).then(({ data: ownerId }: any) => {
              if (ownerId) {
                supabase.functions
                  .invoke("send-transactional-email", {
                    body: {
                      templateName: "mention-status",
                      recipientUserId: ownerId,
                      idempotencyKey: `mention-status-${messageId}-${mentionData.status}-brand`,
                      templateData: {
                        recipientRole: "brand",
                        campaignTitle: mentionData.campaign_title,
                        deliverableType: mentionData.deliverable_type,
                        feeAmount: mentionData.fee_amount,
                        status: mentionData.status,
                      },
                    },
                  })
                  .catch(console.error);
              }
            });
          }
        } else if (msg?.message_type === "gift_offer") {
          const giftData = data as GiftOfferData;
          if (senderIsBrand && creatorId) {
            // Brand changed status → notify creator
            supabase.functions
              .invoke("send-transactional-email", {
                body: {
                  templateName: "gift-status-creator",
                  recipientUserId: creatorId,
                  idempotencyKey: `gift-status-${messageId}-${giftData.status}`,
                  templateData: {
                    productName: giftData.product_name,
                    status: giftData.status,
                    trackingNumber: giftData.tracking_number,
                  },
                },
              })
              .catch(console.error);
          } else if (!senderIsBrand && brandId) {
            // Creator changed status → notify brand
            supabase.rpc("get_brand_owner_user_id", { p_brand_id: brandId }).then(({ data: ownerId }: any) => {
              if (ownerId) {
                supabase.functions
                  .invoke("send-transactional-email", {
                    body: {
                      templateName: "gift-response-brand",
                      recipientUserId: ownerId,
                      idempotencyKey: `gift-response-${messageId}-${giftData.status}`,
                      templateData: {
                        productName: giftData.product_name,
                        status: giftData.status,
                        shippingAddress: giftData.shipping_address,
                        creatorPostUrl: giftData.creator_post_url,
                      },
                    },
                  })
                  .catch(console.error);
              }
            });
          }
        } else if (msg?.message_type === "discount_code") {
          const discountData = data as DiscountCodeData;
          if (senderIsBrand && creatorId) {
            supabase.functions
              .invoke("send-transactional-email", {
                body: {
                  templateName: "discount-status",
                  recipientUserId: creatorId,
                  idempotencyKey: `discount-status-${messageId}-${discountData.status}`,
                  templateData: {
                    code: discountData.code,
                    discountType: discountData.discount_type,
                    discountValue: discountData.discount_value,
                    expiryDate: discountData.expiry_date,
                    status: discountData.status,
                  },
                },
              })
              .catch(console.error);
          } else if (!senderIsBrand && brandId) {
            supabase.rpc("get_brand_owner_user_id", { p_brand_id: brandId }).then(({ data: ownerId }: any) => {
              if (ownerId) {
                supabase.functions
                  .invoke("send-transactional-email", {
                    body: {
                      templateName: "discount-status",
                      recipientUserId: ownerId,
                      idempotencyKey: `discount-status-${messageId}-${discountData.status}-brand`,
                      templateData: {
                        code: discountData.code,
                        discountType: discountData.discount_type,
                        discountValue: discountData.discount_value,
                        expiryDate: discountData.expiry_date,
                        status: discountData.status,
                      },
                    },
                  })
                  .catch(console.error);
              }
            });
          }
        } else if (msg?.message_type === "paid_collab") {
          const collabData = data as any;
          const newStatus = collabData.status;

          if (senderIsBrand && creatorId) {
            // Brand edited/updated the offer → notify creator
            const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "collab-status",
                recipientUserId: creatorId,
                idempotencyKey: `collab-status-${messageId}-${newStatus}-creator`,
                templateData: {
                  recipientRole: "creator",
                  brandName: brandName || "A brand",
                  collabTitle: collabData.title,
                  compensationType: collabData.compensation_type,
                  status: newStatus,
                  feeAmount: collabData.fee_amount,
                  productName: collabData.product_name,
                },
              },
            });
            if (emailError) {
              console.error("Failed to send creator collab-status email", emailError);
              toast.error("Collab updated, but the email notification could not be sent.");
            }
          }
          // Creator-side (accept / decline / negotiate) → the brand
          // collab-status email is owned by the DB trigger
          // `notify_brand_on_paid_collab_status_change`. Do not send from the
          // client here or we get a duplicate-send race with the trigger.
        }
      }
    }

    return result;
  };

  const handleUpdateBriefStatus = async (messageId: string, status: BriefStatus, progressNote?: string) => {
    const msgBefore = messages.find((m) => m.id === messageId);
    const oldStatus = (msgBefore?.brief_data as any)?.status;
    const result = await updateBriefStatus(messageId, status, progressNote);

    if (!msgBefore || oldStatus === status) return result;

    const brief = (msgBefore.brief_data as BriefData) || ({} as BriefData);

    // System message removed — the brief card already shows the current status.

    // Email the other party
    if (user) {
      const senderIsBrand = isBrand;
      const sendEmail = (recipientUserId: string, recipientRole: "brand" | "creator") => {
        supabase.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "brief-status",
              recipientUserId,
              idempotencyKey: `brief-status-${messageId}-${status}`,
              templateData: {
                recipientRole,
                briefTitle: brief.title,
                status,
                progressNote: progressNote || brief.progress_note,
                brandName: (!senderIsBrand ? partnerName : brandName) || brandName || undefined,
                creatorName: (senderIsBrand ? partnerName : creatorName) || creatorName || undefined,
                budget: brief.budget,
                deadline: brief.deadline,
              },
            },
          })
          .catch(console.error);
      };

      if (senderIsBrand && creatorId) {
        sendEmail(creatorId, "creator");
      } else if (!senderIsBrand && brandId) {
        const { data: ownerId } = await supabase.rpc("get_brand_owner_user_id", { p_brand_id: brandId });
        if (ownerId) {
          sendEmail(ownerId as string, "brand");
        }
      }
    }

    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openAssignCollab = async () => {
    if (!brandId) return;
    const { data } = await supabase
      .from("paid_collabs")
      .select("id, title, compensation_type, status, creator_ids")
      .eq("brand_id", brandId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setCollabs((data as unknown as PaidCollab[]) || []);
    setShowAssignCollab(true);
  };

  const handleAssign = async (collabId: string, currentIds: string[] | null) => {
    if (!creatorId) return;
    setAssigning(collabId);
    const updatedIds = [...new Set([...(currentIds || []), creatorId])];
    const { error } = await supabase
      .from("paid_collabs" as any)
      .update({ creator_ids: updatedIds })
      .eq("id", collabId);
    if (error) {
      toast.error("Could not assign creator");
    } else {
      toast.success("Creator assigned to collab");
      setShowAssignCollab(false);
    }
    setAssigning(null);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 md:hidden shrink-0" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-9 w-9">
            <AvatarImage src={partnerPhoto || undefined} />
            <AvatarFallback className="text-xs">{partnerName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-sm text-foreground">{partnerName}</h3>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Start the conversation by sending a message.
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            if (msg.message_type === "system" || (msg.message_type as string) === "gift_request") {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1 text-center max-w-[85%]">
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex items-start gap-1 group ${isMe ? "justify-end" : "justify-start"}`}
              >
                {role === "admin" && isMe && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div
                  className={`max-w-[75%] ${
                    ["brief", "mention_request", "gift_offer", "discount_code", "paid_collab"].includes(
                      msg.message_type,
                    )
                      ? "w-full max-w-md"
                      : ""
                  }`}
                >
                  {msg.message_type === "brief" && msg.brief_data ? (
                    <BriefCard
                      brief={msg.brief_data as unknown as BriefData}
                      isMe={isMe}
                      messageId={msg.id}
                      onUpdateStatus={handleUpdateBriefStatus}
                      canSendBrief={canSendBrief}
                    />
                  ) : msg.message_type === "mention_request" && msg.brief_data ? (
                    <MentionRequestCard
                      data={msg.brief_data as unknown as MentionRequestData}
                      isMe={isMe}
                      isBrand={isBrand}
                      messageId={msg.id}
                      onUpdate={handleUpdateMessageData}
                    />
                  ) : msg.message_type === "gift_offer" && msg.brief_data ? (
                    <GiftOfferCard
                      data={msg.brief_data as unknown as GiftOfferData}
                      isMe={isMe}
                      isBrand={isBrand}
                      messageId={msg.id}
                      onUpdate={handleUpdateMessageData}
                    />
                  ) : msg.message_type === "discount_code" && msg.brief_data ? (
                    <DiscountCodeCard
                      data={msg.brief_data as unknown as DiscountCodeData}
                      isMe={isMe}
                      isBrand={isBrand}
                      messageId={msg.id}
                      onUpdate={handleUpdateMessageData}
                    />
                  ) : msg.message_type === "paid_collab" && msg.brief_data ? (
                    <PaidCollabCard
                      data={msg.brief_data as any}
                      isMe={isMe}
                      isBrand={isBrand}
                      messageId={msg.id}
                      onUpdate={handleUpdateMessageData}
                      onEdit={(messageId, data) => {
                        setActiveComposer(data.compensation_type as ComposerType);
                        setEditingCollab({ messageId, data });
                      }}
                    />
                  ) : (
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap ${
                        isMe
                          ? "bg-foreground text-background rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? "text-right" : "text-left"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {role === "admin" && !isMe && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Composer */}
        {activeComposer && brandId && creatorId && (
          <CollabComposer
            type={activeComposer}
            brandId={brandId}
            creatorId={creatorId}
            partnerName={partnerName}
            onSent={() => {
              setActiveComposer(null);
              setEditingCollab(null);
            }}
            onCancel={() => {
              setActiveComposer(null);
              setEditingCollab(null);
            }}
            sendMessage={sendMessage}
            editMessage={editingCollab || undefined}
          />
        )}

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0 space-y-2">
          {moderationWarning && (
            <div
              role="alert"
              className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Message blocked</p>
                <p className="mt-0.5 text-destructive/90">{moderationWarning}</p>
              </div>
              <button
                type="button"
                onClick={() => setModerationWarning(null)}
                className="text-destructive/70 hover:text-destructive"
                aria-label="Dismiss warning"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {canSendBrief && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0" title="Send request">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Gifting
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Gifting + Deliverables
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Paid Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Paid Campaign + Gifting
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Mention Request
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground/40 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Discount Code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (moderationWarning) setModerationWarning(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
              className="min-h-[40px] max-h-[120px] resize-none py-2 overflow-hidden"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending} className="shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      {showAssignCollab && (
        <Dialog open={showAssignCollab} onOpenChange={setShowAssignCollab}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Assign to Paid Collab</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {collabs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active paid collabs found. Create one from the Paid Collabs page first.
                </p>
              ) : (
                collabs.map((collab) => {
                  const alreadyAssigned = (collab.creator_ids || []).includes(creatorId || "");
                  return (
                    <button
                      key={collab.id}
                      type="button"
                      disabled={alreadyAssigned || assigning === collab.id}
                      onClick={() => handleAssign(collab.id, collab.creator_ids)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        alreadyAssigned
                          ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                          : "border-border bg-background hover:border-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{collab.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{collab.compensation_type}</p>
                      </div>
                      {alreadyAssigned ? (
                        <span className="text-xs text-muted-foreground">Already assigned</span>
                      ) : assigning === collab.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ── Status config ── */
const STATUS_CONFIG: Record<BriefStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: <ClipboardList className="h-3 w-3" /> },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700", icon: <Check className="h-3 w-3" /> },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: <X className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: <Play className="h-3 w-3" /> },
  content_ready: { label: "Content Ready", color: "bg-violet-100 text-violet-700", icon: <Eye className="h-3 w-3" /> },
  revision_needed: {
    label: "Revision Needed",
    color: "bg-orange-100 text-orange-700",
    icon: <RotateCcw className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

const PROGRESS_STEPS: BriefStatus[] = ["pending", "accepted", "in_progress", "content_ready", "completed"];

const CREATOR_NEXT_STATUSES: Partial<Record<BriefStatus, BriefStatus[]>> = {
  accepted: ["in_progress"],
  in_progress: ["content_ready"],
  content_ready: ["completed"],
  revision_needed: ["in_progress"],
};

const BRAND_NEXT_STATUSES: Partial<Record<BriefStatus, BriefStatus[]>> = {
  content_ready: ["revision_needed", "completed"],
};

function BriefCard({
  brief,
  isMe,
  messageId,
  onUpdateStatus,
  canSendBrief,
}: {
  brief: BriefData;
  isMe: boolean;
  messageId: string;
  onUpdateStatus: (messageId: string, status: BriefStatus, progressNote?: string) => Promise<any>;
  canSendBrief: boolean;
}) {
  const [updating, setUpdating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BriefStatus | null>(null);
  const [note, setNote] = useState("");

  const currentStatus = brief.status || "pending";
  const config = STATUS_CONFIG[currentStatus];

  const isBrandUser = canSendBrief;
  const isCreator = !canSendBrief;

  const nextStatuses = isBrandUser
    ? currentStatus === "pending"
      ? []
      : BRAND_NEXT_STATUSES[currentStatus] || []
    : currentStatus === "pending"
      ? (["accepted", "declined"] as BriefStatus[])
      : CREATOR_NEXT_STATUSES[currentStatus] || [];

  const handleAction = async (status: BriefStatus) => {
    if (["in_progress", "content_ready", "revision_needed"].includes(status)) {
      setPendingStatus(status);
      setShowNoteInput(true);
      return;
    }
    setUpdating(true);
    await onUpdateStatus(messageId, status);
    setUpdating(false);
  };

  const handleSubmitWithNote = async () => {
    if (!pendingStatus) return;
    setUpdating(true);
    await onUpdateStatus(messageId, pendingStatus, note.trim() || undefined);
    setShowNoteInput(false);
    setPendingStatus(null);
    setNote("");
    setUpdating(false);
  };

  const currentStepIndex = PROGRESS_STEPS.indexOf(currentStatus);
  const showProgressBar = currentStatus !== "declined";

  return (
    <Card className={`border ${isMe ? "border-foreground/20" : "border-border"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Promotional Brief</span>
          </div>
          <Badge className={`${config.color} gap-1`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        <h4 className="font-medium text-foreground">{brief.title}</h4>
        <p className="text-sm text-muted-foreground">{brief.description}</p>
        {brief.deliverables && (
          <div className="text-sm">
            <span className="text-muted-foreground">Deliverables:</span>{" "}
            <span className="text-foreground">{brief.deliverables}</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm">
          {brief.budget && <div className="flex items-center gap-1 text-muted-foreground">{brief.budget}</div>}
          {brief.deadline && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {brief.deadline}
            </div>
          )}
        </div>

        {showProgressBar && currentStatus !== "pending" && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              {PROGRESS_STEPS.map((step, idx) => {
                const stepConfig = STATUS_CONFIG[step];
                const isActive = idx <= currentStepIndex;
                const isCurrent = step === currentStatus;
                return (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`h-1.5 w-full rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}
                    />
                    <span
                      className={`text-[9px] leading-tight text-center ${
                        isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {stepConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {brief.progress_note && (
          <div className="bg-secondary/50 rounded-lg p-2.5 text-xs">
            <span className="text-muted-foreground font-medium">Latest update: </span>
            <span className="text-foreground">{brief.progress_note}</span>
            {brief.status_updated_at && (
              <span className="text-muted-foreground ml-1">
                · {formatDistanceToNow(new Date(brief.status_updated_at), { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {showNoteInput && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Add a note for <strong>{STATUS_CONFIG[pendingStatus!]?.label}</strong>:
            </p>
            <Textarea
              placeholder="e.g. Started shooting content, will have drafts by Friday..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[50px] text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitWithNote} disabled={updating} className="flex-1">
                {updating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Update Status
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNoteInput(false);
                  setPendingStatus(null);
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showNoteInput && nextStatuses.length > 0 && (
          <div className="pt-2 border-t border-border">
            {currentStatus === "pending" && isCreator ? (
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleAction("accepted")} disabled={updating} className="flex-1">
                  {updating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("declined")}
                  disabled={updating}
                  className="flex-1"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Decline
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full" disabled={updating}>
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Update Status
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {nextStatuses.map((status) => {
                    const sc = STATUS_CONFIG[status];
                    return (
                      <DropdownMenuItem key={status} onClick={() => handleAction(status)}>
                        <span className="mr-2">{sc.icon}</span>
                        {sc.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
