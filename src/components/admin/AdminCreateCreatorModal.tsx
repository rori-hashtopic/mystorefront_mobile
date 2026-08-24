import { useState } from "react";
import { Loader2, ArrowRight, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface AdminCreateCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AdminCreateCreatorModal({ isOpen, onClose, onCreated }: AdminCreateCreatorModalProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleCreate = async () => {
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-creator", {
        body: { email: email.trim(), display_name: displayName.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Creator account created!" });
      setEmail("");
      setDisplayName("");
      onCreated();
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to create creator",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</span>
            <DialogTitle asChild>
              <h2 className="font-display text-2xl sm:text-3xl mt-1">Create Creator</h2>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Add a new creator account to the platform.</p>
            <div className="h-px bg-border mt-4" />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email Address *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full bg-transparent border-0 border-b border-border focus:border-foreground py-2 text-base outline-none transition-colors placeholder:text-muted-foreground/50"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-transparent border-0 border-b border-border focus:border-foreground py-2 text-base outline-none transition-colors placeholder:text-muted-foreground/50"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div className="pt-6">
              <div className="h-px bg-border mb-6" />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isCreating}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || !email.trim()}
                  className="text-sm font-medium inline-flex items-center gap-1 hover:underline underline-offset-4 transition-all min-h-[44px] px-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Creator
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
