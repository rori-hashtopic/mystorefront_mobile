import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Truck,
  Upload,
  ExternalLink,
  CheckCircle2,
  FileVideo,
  Banknote,
  Send,
  Plus,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emailBrandOnCollabStatus } from "@/lib/collabEmails";
import { hasCashFee, hasContentDeliverables } from "@/lib/collabTypes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  collabId: string;
  creatorId: string;
  compensationType: string;
  feeAmount?: number | null;
  paymentTerms?: string | null;
  onStatusChange?: (status: string) => void;
}

interface Participant {
  id: string;
  status: string;
  shipping_address: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  live_post_urls: string[] | null;
  verified_live_at: string | null;
  revision_count: number;
  revision_note: string | null;
  payment_status: string;
  payment_amount: number | null;
  paid_at: string | null;
}

interface Submission {
  id: string;
  file_url: string;
  file_name: string | null;
  storage_path: string;
  caption: string | null;
  platform: string | null;
  version: number;
  status: string;
  review_note: string | null;
  created_at: string;
}

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function CreatorCollabWorkspace({
  collabId,
  creatorId,
  compensationType,
  feeAmount,
  paymentTerms,
  onStatusChange,
}: Props) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [uploading, setUploading] = useState(false);
  const [livePostInput, setLivePostInput] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mention Request behaves like a Paid Campaign post-accept: draft submission,
  // live-post URLs and payment tracking.
  // Both derived from @/lib/collabTypes so the brand's Manage drawer and this
  // workspace can never disagree about what a collab involves — they used to,
  // and creators submitted work brands had no way to open.
  const isPaid = hasCashFee(compensationType);
  const hasDeliverables = hasContentDeliverables(compensationType);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("paid_collab_participants" as any)
      .select("*")
      .eq("collab_id", collabId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (!p) {
      setLoading(false);
      return;
    }

    setParticipant(p as unknown as Participant);

    const { data: subs } = await supabase
      .from("paid_collab_submissions" as any)
      .select("*")
      .eq("participant_id", (p as any).id)
      .order("created_at", { ascending: false });
    setSubmissions((subs as unknown as Submission[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabId, creatorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!participant) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Workspace will appear here once the brand activates this collab.
      </p>
    );
  }

  const uploadDraft = async () => {
    if (!stagedFile) return;
    const file = stagedFile;
    setUploading(true);
    try {
      const path = `${creatorId}/${collabId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("collab-submissions").upload(path, file);
      if (upErr) throw upErr;
      // Checked before the insert, so a failure here leaves no row pointing at
      // an empty URL that the brand would click and get nothing from.
      const { data: signed, error: signErr } = await supabase.storage
        .from("collab-submissions")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signErr || !signed?.signedUrl) {
        throw new Error("Could not generate a link for your file. Please try again.");
      }
      const url = signed.signedUrl;

      const nextVersion = (submissions[0]?.version || 0) + 1;
      const { error: insErr } = await supabase.from("paid_collab_submissions" as any).insert({
        participant_id: participant.id,
        file_url: url,
        storage_path: path,
        file_name: file.name,
        file_type: file.type,
        caption: caption || null,
        platform,
        version: nextVersion,
        status: "pending",
      });
      if (insErr) throw insErr;

      // The submission row above is the authoritative record and it has already
      // landed, so email the brand FIRST — it must not become collateral damage
      // of the cosmetic flag below failing.
      emailBrandOnCollabStatus({ collabId, creatorId, status: "draft_submitted", idempotencySuffix: nextVersion });

      // This flag only drives the amber "needs attention" dot on the brand's
      // collab list; the draft itself is already visible in their Manage drawer,
      // which queries submissions directly. So warn rather than throw away a
      // good upload. An update blocked by RLS returns NO error and simply
      // matches zero rows, which is why .select() is needed to detect it.
      const { data: flagRows, error: flagErr } = await supabase
        .from("paid_collab_participants" as any)
        .update({ status: "draft_submitted" })
        .eq("id", participant.id)
        .select("id");

      if (flagErr || !flagRows || flagRows.length === 0) {
        console.error("Could not flag draft_submitted for participant", participant.id, flagErr);
        toast.warning("Draft submitted — the brand has been emailed, but we couldn't flag it on their dashboard.");
      } else {
        toast.success("Draft submitted for review");
        onStatusChange?.("draft_submitted");
      }
      setCaption("");
      setStagedFile(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteSubmission = async (submissionId: string, storagePath: string) => {
    setDeleting(submissionId);
    try {
      // ORDER IS THE WHOLE FIX. Creators hold SELECT and INSERT on
      // paid_collab_submissions but NOT delete, while they DO hold delete on the
      // storage bucket. So the old order — remove the file, then "delete" the
      // row — permanently destroyed the creator's upload, left the row behind,
      // and reported "Draft removed". The brand was left with a draft they could
      // still approve whose link was dead.
      // A delete blocked by RLS returns NO error and removes nothing, so
      // .select() is the only way to know whether the row actually went.
      const { data: deletedRows, error: delErr } = await supabase
        .from("paid_collab_submissions" as any)
        .delete()
        .eq("id", submissionId)
        .select("id");
      if (delErr) throw delErr;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("This draft can't be removed from here. Ask the brand to request changes instead.");
      }

      // The row is gone, so the file can go. A failure at this point only
      // orphans a file in a private bucket — invisible to both sides.
      await supabase.storage.from("collab-submissions").remove([storagePath]);
      toast.success("Draft removed");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Could not delete");
    } finally {
      setDeleting(null);
    }
  };

  const submitLivePost = async () => {
    const url = livePostInput.trim();
    if (!url) return;
    const next = [...(participant.live_post_urls || []), url];
    const { error } = await supabase
      .from("paid_collab_participants" as any)
      .update({ live_post_urls: next, status: "live" })
      .eq("id", participant.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Notify the brand that the creator has gone live.
    emailBrandOnCollabStatus({ collabId, creatorId, status: "posted_live", idempotencySuffix: next.length });
    setLivePostInput("");
    toast.success("Live post submitted");
    onStatusChange?.("live");
    fetchData();
  };

  return (
    <div className="space-y-5 border-t border-border pt-5">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Workspace</h4>

      {/* Draft upload — hidden once a submission has been approved */}
      {hasDeliverables && !submissions.some((s) => s.status === "approved") && (
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5 text-foreground">
            <FileVideo className="h-3.5 w-3.5" /> Submit Draft for Review
          </p>

          {participant.revision_note && participant.status === "revisions_requested" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="text-xs font-medium mb-1">Brand requested changes:</p>
              <p>{participant.revision_note}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Platform</Label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">File</Label>
                {stagedFile ? (
                  <div className="mt-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{stagedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setStagedFile(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 w-full"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Choose File
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setStagedFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <Textarea
              placeholder="Planned caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <Button size="sm" className="w-full" onClick={uploadDraft} disabled={!stagedFile || uploading}>
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              Submit Draft for Review
            </Button>
          </div>

          {submissions.length > 0 && (
            <div className="space-y-2 pt-1">
              {submissions.map((s) => (
                <div key={s.id} className="rounded border p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      v{s.version} · {s.platform}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          s.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : s.status === "changes_requested"
                              ? "bg-amber-100 text-amber-700"
                              : ""
                        }
                      >
                        {s.status.replace("_", " ")}
                      </Badge>
                      {s.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => deleteSubmission(s.id, s.storage_path)}
                          disabled={deleting === s.id}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove draft"
                        >
                          {deleting === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>✕</span>}
                        </button>
                      )}
                    </div>
                  </div>
                  <a
                    href={s.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> {s.file_name}
                  </a>
                  {s.caption && <p className="text-muted-foreground italic">{s.caption}</p>}
                  {s.review_note && <p className="text-amber-700">Brand: {s.review_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Draft approved notice */}
      {hasDeliverables && submissions.some((s) => s.status === "approved") && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Draft approved</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              The brand has approved your draft. You can now post your content live and submit the URL below.
            </p>
          </div>
        </div>
      )}

      {/* Live post URL submission — only after at least one draft is approved */}
      {hasDeliverables && submissions.some((s) => s.status === "approved") && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Live Post URLs</p>
          {participant.live_post_urls && participant.live_post_urls.length > 0 && (
            <ul className="space-y-1">
              {participant.live_post_urls.map((u) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> {u}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="https://instagram.com/p/..."
              value={livePostInput}
              onChange={(e) => setLivePostInput(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={submitLivePost} disabled={!livePostInput.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Paste each live post link and tap Add. You can add multiple.</p>
          {participant.verified_live_at && (
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Verified live by the brand
            </p>
          )}
        </div>
      )}

      {/* Payment — only visible after creator has submitted at least one draft */}
      {isPaid && feeAmount && submissions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5 text-foreground">
            <Banknote className="h-3.5 w-3.5" /> Payment
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs">
                Payments are processed monthly. You'll be paid once the brand has settled their invoice with
                MyStorefront.
              </TooltipContent>
            </Tooltip>
          </p>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{ZAR.format(participant.payment_amount ?? feeAmount)}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Status: {participant.payment_status}
              {participant.paid_at && ` · paid ${new Date(participant.paid_at).toLocaleDateString("en-ZA")}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
