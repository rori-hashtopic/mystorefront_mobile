import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { demoDiscountCodes, getCreator, formatZAR } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

export default function DemoBrandDiscountCodes() {
  const { demoAction } = useDemoMode();

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="paid" />
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Discount Codes</h1>
            <p className="text-muted-foreground">
              Issue and manage unique discount codes for creators and campaigns.
            </p>
          </div>
          <Button onClick={() => demoAction("Demo — code creation disabled.")}>
            <Plus className="h-4 w-4 mr-2" /> New code
          </Button>
        </div>

        <Card>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoDiscountCodes.map((dc) => {
                const c = dc.creator_id ? getCreator(dc.creator_id) : null;
                return (
                  <TableRow key={dc.id}>
                    <TableCell>
                      <span className="font-mono font-semibold">{dc.code}</span>
                    </TableCell>
                    <TableCell>
                      {dc.discount_type === "percentage"
                        ? `${dc.discount_value}%`
                        : formatZAR(dc.discount_value)}
                    </TableCell>
                    <TableCell>
                      {c ? (
                        <span className="text-sm">{c.display_name}</span>
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
                      <span className="text-xs text-muted-foreground">
                        {dc.expiry_date ?? "No expiry"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {dc.synced ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertCircle className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dc.is_active ? "default" : "secondary"}>
                        {dc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DemoBrandLayout>
  );
}
