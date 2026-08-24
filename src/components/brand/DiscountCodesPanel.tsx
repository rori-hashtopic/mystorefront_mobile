import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, AlertCircle, Loader2, RefreshCw, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { CreateDiscountCodeModal } from "@/components/brand/CreateDiscountCodeModal";
import { EditDiscountCodeModal } from "@/components/brand/EditDiscountCodeModal";
import { AssignDiscountCodeModal } from "@/components/brand/AssignDiscountCodeModal";
import { useDiscountCodes, type DiscountCode } from "@/hooks/useDiscountCodes";
import { formatDistanceToNow } from "date-fns";

const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

interface DiscountCodesPanelProps {
  brandId: string;
  brandName: string;
  /** Rendered above the actions row. Omit on pages that supply their own heading. */
  heading?: React.ReactNode;
  /** Copy shown when the brand has no codes yet. */
  emptyMessage?: string;
}

/**
 * Discount codes list with live store sync. Used as the whole body of the
 * Discount Codes page and as the Discount Code category section on Paid
 * Collabs, so both stay in step automatically.
 */
export function DiscountCodesPanel({
  brandId,
  brandName,
  heading,
  emptyMessage = "No discount codes yet. Create your first code to get started.",
}: DiscountCodesPanelProps) {
  const {
    codes,
    creators,
    loading,
    syncing,
    lastSyncedAt,
    storeConnected,
    storeLabel,
    runSync,
    fetchCodes,
    toggleActive,
    deleteCode,
  } = useDiscountCodes(brandId);

  const [showCreate, setShowCreate] = useState(false);
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);
  const [assignCode, setAssignCode] = useState<DiscountCode | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {heading}
          {/* Full width on mobile so the actions are easy to hit; natural width
              and right-aligned from sm up. */}
          <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
            {storeConnected && (
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => runSync()} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync now
              </Button>
            )}
            <Button className="flex-1 sm:flex-none" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> New code
            </Button>
          </div>
        </div>

        {storeConnected && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Live sync with {storeLabel}
            </span>
            {lastSyncedAt && <span>Last synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</span>}
          </div>
        )}

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((dc) => {
                    const c = dc.creator_id ? creators[dc.creator_id] : null;
                    // A failed push clears needs_sync (the trigger would otherwise
                    // retry forever), so without checking the error columns a code
                    // that never reached the store still renders as "Synced".
                    const syncError = dc.shopify_sync_error || dc.woocommerce_sync_error || null;
                    const synced = !dc.needs_sync && !syncError && (!!dc.shopify_price_rule_id || !!dc.wc_coupon_id);
                    // A code can be switched on and still be unusable — fully
                    // redeemed, or past its expiry. Labelling those "Active" tells
                    // the brand, and any creator promoting the code, that it works
                    // when checkout will reject it.
                    const exhausted = dc.usage_limit != null && dc.usage_limit > 0 && dc.usage_count >= dc.usage_limit;
                    const expired = !!dc.expiry_date && new Date(dc.expiry_date).getTime() < Date.now();
                    return (
                      <TableRow key={dc.id}>
                        <TableCell>
                          <span className="font-mono font-semibold">{dc.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {dc.discount_type === "percentage"
                                ? `${dc.discount_value}%`
                                : formatZAR(dc.discount_value)}
                            </span>
                            {/* The minimum spend decides whether the code works at
                                checkout, so hiding it left the brand unable to see
                                why a shopper's discount was rejected. Shown here
                                rather than as a ninth column to keep the table
                                readable on mobile. */}
                            {dc.minimum_order_value != null && dc.minimum_order_value > 0 && (
                              <span className="text-xs text-muted-foreground">
                                min {formatZAR(dc.minimum_order_value)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c ? (
                            <span className="text-sm">{c.display_name || "Creator"}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {dc.usage_count} / {dc.usage_limit ?? "∞"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{dc.expiry_date ?? "No expiry"}</span>
                        </TableCell>
                        <TableCell>
                          {synced ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Synced
                            </span>
                          ) : syncError ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700" title={syncError}>
                              <AlertCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                              <AlertCircle className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* variant="default" renders as the theme's coral, so a
                              perfectly healthy code read as an error sitting next
                              to the green "Synced". Match the emerald used for
                              campaign status instead, and amber for a code that is
                              switched on but can no longer be redeemed. */}
                          {!dc.is_active ? (
                            <Badge variant="secondary">Inactive</Badge>
                          ) : exhausted ? (
                            <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
                              Used up
                            </Badge>
                          ) : expired ? (
                            <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
                              Expired
                            </Badge>
                          ) : (
                            <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setEditCode(dc)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAssignCode(dc)}>Assign to Creator</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleActive(dc)}>
                                {dc.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(dc.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <CreateDiscountCodeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          fetchCodes();
        }}
        brandId={brandId}
        brandName={brandName}
      />

      {editCode && (
        <EditDiscountCodeModal
          isOpen={!!editCode}
          onClose={() => setEditCode(null)}
          onUpdated={() => {
            setEditCode(null);
            fetchCodes();
          }}
          code={editCode}
        />
      )}

      {assignCode && (
        <AssignDiscountCodeModal
          isOpen={!!assignCode}
          onClose={() => setAssignCode(null)}
          onAssigned={() => {
            setAssignCode(null);
            fetchCodes();
          }}
          code={assignCode}
          brandId={brandId}
          brandName={brandName}
          currentCreator={assignCode.creator_id ? (creators[assignCode.creator_id] ?? null) : null}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this discount code?</AlertDialogTitle>
            {/* Deleting here also pushes a delete to the connected store, so the
                code stops working for shoppers immediately. Saying so matters now
                that the store delete actually succeeds. */}
            <AlertDialogDescription>
              {storeConnected
                ? `This action cannot be undone. The code will be permanently removed from MyStorefront and deleted from ${storeLabel}, so shoppers will no longer be able to redeem it.`
                : "This action cannot be undone. The code will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteCode(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
