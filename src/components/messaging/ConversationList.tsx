import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, MoreVertical, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Conversation } from "@/hooks/useConversations";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  viewAs: "brand" | "creator";
  showArchived?: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  viewAs,
  showArchived = false,
  onArchive,
  onUnarchive,
  onDelete,
}: ConversationListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {showArchived
            ? "No archived conversations."
            : viewAs === "brand"
              ? "No conversations yet. Message a creator from the directory!"
              : "No messages yet. Brands will reach out to you here."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="divide-y divide-border">
          {conversations.map((conv) => {
            const name = viewAs === "brand" ? conv.creator_name : conv.brand_name;
            const photo = viewAs === "brand" ? conv.creator_photo : conv.brand_logo;
            const isSelected = selectedId === conv.id;
            const isBrand = viewAs === "brand";

            return (
              <div
                key={conv.id}
                className={`relative group w-full text-left p-4 pr-5 hover:bg-secondary/50 transition-colors cursor-pointer ${
                  isSelected ? "bg-secondary" : ""
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={photo || undefined} />
                    <AvatarFallback className="text-xs">{name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {conv.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                        {isBrand && (onArchive || onUnarchive || onDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary"
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {!showArchived && onArchive && (
                                <DropdownMenuItem onClick={() => onArchive(conv.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              {showArchived && onUnarchive && (
                                <DropdownMenuItem onClick={() => onUnarchive(conv.id)}>
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                  Unarchive
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(conv.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-0.5">
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{conv.last_message}</p>
                      )}
                      {(conv.unread_count ?? 0) > 0 && (
                        <Badge className="h-5 min-w-5 flex items-center justify-center text-[10px] rounded-full bg-foreground text-background shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId && onDelete) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
