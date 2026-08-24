import { useEffect } from "react";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";

export default function Walkthrough() {
  useEffect(() => {
    document.title = "MyStorefront — 60-second walkthrough";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Watch a 60-second walkthrough of MyStorefront — a creator affiliate platform for South African brands.";
    if (meta) meta.setAttribute("content", desc);
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center py-10 sm:py-16 px-4 sm:px-6">
      <div className="mb-8 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          A 60-second walkthrough
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">MyStorefront</h1>
      </div>
      <WalkthroughPlayer />
    </main>
  );
}
