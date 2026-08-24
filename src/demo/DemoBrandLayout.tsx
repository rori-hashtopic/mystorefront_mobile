import { ReactNode } from "react";
import { DemoBrandNavbar } from "./DemoBrandNavbar";
import { DemoModeProvider } from "./DemoModeContext";
import { demoBrand } from "./mockData";
import { BrandDemoTour } from "./tour/BrandDemoTour";

interface DemoBrandLayoutProps {
  children: ReactNode;
}

export function DemoBrandLayout({ children }: DemoBrandLayoutProps) {
  return (
    <DemoModeProvider>
      <div className="min-h-screen bg-card flex flex-col">
        <DemoBrandNavbar brandName={demoBrand.name} brandStatus={demoBrand.status} />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <BrandDemoTour />
      </div>
    </DemoModeProvider>
  );
}
