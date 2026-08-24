import { HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function AppFooter({ helpPath = "/help" }: { helpPath?: string }) {
  const handleChatClick = () => {
    window.location.href = "mailto:support@mystorefront.io";
  };

  return (
    <footer className="border-t border-border mt-16 py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Need help? We're here for you.</p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
              <Link to={helpPath}>
                <HelpCircle className="h-4 w-4" />
                Help Center
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChatClick}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Support
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
