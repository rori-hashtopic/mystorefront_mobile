import { ReactNode } from "react";
import { BrandNavbar } from "./BrandNavbar";
import { AppFooter } from "./AppFooter";

interface BrandLayoutProps {
  children: ReactNode;
  brandName?: string;
  brandStatus?: "pending" | "approved" | "rejected" | "suspended";
  brandPlan?: "free" | "premium";
}

export function BrandLayout({ children, brandName, brandStatus, brandPlan }: BrandLayoutProps) {
  return (
    <div className="min-h-screen bg-card flex flex-col">
      <BrandNavbar brandName={brandName} brandPlan={brandPlan} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      <AppFooter helpPath="/brand/help" />
    </div>
  );
}
