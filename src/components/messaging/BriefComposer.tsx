import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, X } from "lucide-react";
import type { BriefData } from "@/hooks/useMessages";
import { CollabSelector, assignCreatorToCollab } from "./CollabSelector";

interface BriefComposerProps {
  onSend: (brief: BriefData) => void;
  onCancel: () => void;
  sending: boolean;
  brandId?: string;
  creatorId?: string;
}

export function BriefComposer({ onSend, onCancel, sending, brandId, creatorId }: BriefComposerProps) {
  const [collabId, setCollabId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    if (brandId && creatorId) await assignCreatorToCollab(collabId, creatorId);
    onSend({
      title: title.trim(),
      description: description.trim(),
      deliverables: deliverables.trim() || undefined,
      budget: budget.trim() || undefined,
      deadline: deadline.trim() || undefined,
      status: "pending",
    });
  };

  return (
    <div className="border-t border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-foreground">New Promotional Brief</h4>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {brandId && creatorId && (
        <CollabSelector brandId={brandId} creatorId={creatorId} value={collabId} onChange={setCollabId} />
      )}

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Campaign Title *</Label>
          <Input
            placeholder="e.g. Summer Collection Launch"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Description *</Label>
          <Textarea
            placeholder="Describe the campaign, goals, and expectations..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 min-h-[60px]"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Deliverables</Label>
            <Input
              placeholder="e.g. 2 Reels, 1 Story"
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Budget</Label>
            <Input
              placeholder="e.g. R5,000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || !description.trim() || sending}
        className="w-full"
        size="sm"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        Send Brief
      </Button>
    </div>
  );
}
