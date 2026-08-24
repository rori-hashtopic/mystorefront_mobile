import React from "react";
import { Download } from "lucide-react";
import { motion } from "framer-motion";

interface EarningsTableProps {
  title: string;
  helperText?: string;
  columns: string[];
  children: React.ReactNode;
  showDownload?: boolean;
  onDownload?: () => void;
  hideTitle?: boolean;
  mobileContent?: React.ReactNode;
}

export function EarningsTable({
  title,
  helperText,
  columns,
  children,
  showDownload = false,
  onDownload,
  hideTitle = false,
  mobileContent,
}: EarningsTableProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Details</p>
            <h2 className="font-display text-xl sm:text-2xl text-foreground">{title}</h2>
            {helperText && <p className="text-sm text-muted-foreground mt-2">{helperText}</p>}
          </div>
          {showDownload && (
            <button
              onClick={onDownload}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile: card layout */}
      {mobileContent && <div className="sm:hidden space-y-3">{mobileContent}</div>}

      {/* Desktop: table layout */}
      <div className={`overflow-x-auto -mx-4 sm:mx-0 ${mobileContent ? "hidden sm:block" : ""}`}>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-foreground">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-3 sm:px-4 py-3 text-left text-xs uppercase tracking-[0.15em] text-foreground font-medium whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </motion.section>
  );
}

export function TableEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}

export function MobileEmptyState({ message }: { message: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{message}</div>;
}
