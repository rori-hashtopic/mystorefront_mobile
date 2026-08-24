import { ReactNode } from "react";
import { AdminNavbar } from "./AdminNavbar";

interface AdminLayoutProps {
  children: ReactNode;
  displayName?: string;
}

export function AdminLayout({ children, displayName }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-card flex flex-col">
      <AdminNavbar displayName={displayName} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
