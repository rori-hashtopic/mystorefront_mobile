import { createContext, useContext, ReactNode } from "react";
import { toast } from "sonner";

interface DemoModeContextValue {
  isDemoMode: boolean;
  demoAction: (label?: string) => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  demoAction: () => {},
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const value: DemoModeContextValue = {
    isDemoMode: true,
    demoAction: (label?: string) => {
      toast.info(label || "This is a demo — changes aren't saved.");
    },
  };
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
