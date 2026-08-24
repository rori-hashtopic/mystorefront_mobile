import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Check, X, Clock, User } from "lucide-react";
import { CreatorProfileModal } from "./CreatorProfileModal";
import { formatDistanceToNow } from "date-fns";
import type { MessageRequest } from "@/hooks/useMessageRequests";
import { useToast } from "@/hooks/use-toast";

interface MessageRequestsListProps {
  requests: MessageRequest[];
  loading: boolean;
  viewAs: "brand" | "creator";
  onRespond?: (requestId: string, status: "accepted" | "declined", creatorId: string, brandId: string) => Promise<{ error: string | null; conversationId: string | null }>;
  onConversationCreated?: (conversationId: string) => void;
  selectedRequestId?: string | null;
  onSelectRequest?: (requestId: string) => void;
}

const TIER_LABELS: Record<string, string> = {
  enthusiast: "Insider",
  ambassador: "Featured",
  trendsetter: "Tastemaker",
  icon: "Tastemaker",
};

export function MessageRequestsList({
  requests,
  loading,
  viewAs,
  onRespond,
  onConversationCreated,
  selectedRequestId,
  onSelectRequest,
}: MessageRequestsListProps) {
  const { toast } = useToast();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [profileCreatorId, setProfileCreatorId] = useState<string | null>(null);

  const handleRespond = async (req: MessageRequest, status: "accepted" | "declined") => {
    if (!onRespond) return;
    setRespondingId(req.id);
    const result = await onRespond(req.id, status, req.creator_id, req.brand_id);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Request accepted!" : "Request declined" });
      if (status === "accepted" && result.conversationId && onConversationCreated) {
        onConversationCreated(result.conversationId);
      }
    }
    setRespondingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {viewAs === "brand"
            ? "No message requests yet. Creators will reach out here."
            : "No requests sent yet. Browse brands to request a conversation."}
        </p>
      </div>
    );
  }

  return (
    <>
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {requests.map((req) => {
          const isResponding = respondingId === req.id;
          const name = viewAs === "brand" ? req.creator_name : req.brand_name;
          const photo = viewAs === "brand" ? req.creator_photo : req.brand_logo;

          return (
            <div
              key={req.id}
              className={`p-3 space-y-2 cursor-pointer transition-colors hover:bg-secondary/50 overflow-hidden ${selectedRequestId === req.id ? "bg-secondary" : ""}`}
              onClick={() => onSelectRequest?.(req.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={photo || undefined} />
                  <AvatarFallback className="text-xs">
                    {name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {name}
                      </span>
                      {viewAs === "brand" && req.creator_tier && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {TIER_LABELS[req.creator_tier] || req.creator_tier}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3 break-words">{req.message}</p>
                </div>
              </div>

              {/* Status / Actions */}
              {req.status === "pending" && viewAs === "brand" ? (
                <div className="flex items-center gap-2 pl-[52px] flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProfileCreatorId(req.creator_id)}
                    className="h-7 text-xs"
                  >
                    <User className="h-3 w-3 mr-1" />
                    Profile
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRespond(req, "accepted")}
                    disabled={isResponding}
                    className="h-7 text-xs"
                  >
                    {isResponding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespond(req, "declined")}
                    disabled={isResponding}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="pl-[52px]">
                  <Badge
                    className={
                      req.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : req.status === "declined"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {req.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {req.status === "accepted" && <Check className="h-3 w-3 mr-1" />}
                    {req.status === "declined" && <X className="h-3 w-3 mr-1" />}
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>

    <CreatorProfileModal
      creatorId={profileCreatorId}
      isOpen={!!profileCreatorId}
      onClose={() => setProfileCreatorId(null)}
    />
    </>
  );
}
