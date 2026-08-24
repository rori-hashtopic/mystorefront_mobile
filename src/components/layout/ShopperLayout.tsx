import { ReactNode } from "react";
import { ShopperNavbar } from "./ShopperNavbar";

interface ShopperLayoutProps {
  children: ReactNode;
  /** @deprecated Footer is no longer rendered for shoppers. */
  footer?: ReactNode;
  displayName?: string;
}

export function ShopperLayout({ children, displayName }: ShopperLayoutProps) {
  return (
    <div className="min-h-screen bg-card flex flex-col">
      <ShopperNavbar displayName={displayName} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
