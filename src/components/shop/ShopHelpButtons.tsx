import { HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ShopHelpButtons() {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 shadow-md"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Help center</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              window.location.href = "mailto:support@mystorefront.io";
            }}
            className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 shadow-md"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Chat with support</TooltipContent>
      </Tooltip>
    </div>
  );
}
